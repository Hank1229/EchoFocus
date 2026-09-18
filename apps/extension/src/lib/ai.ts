import type { AiAnalysisResult } from '@echofocus/shared'
import { getSession, refreshSession } from './auth'
import { validateAiAnalysisResult } from './schemas'
import { getAggregateForDate } from '../background/storage'

// Every failure used to collapse into null, so the popup blamed the network for
// expired sessions and empty days alike. Callers localize these reasons.
export type AiFailureReason = 'signed-out' | 'session-expired' | 'no-data' | 'unavailable'

export type AiAnalysisOutcome =
  | { ok: true; result: AiAnalysisResult }
  | { ok: false; reason: AiFailureReason }

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string

// Build the anonymized payload for the AI Edge Function.
// Converts seconds → minutes; includes ONLY domain + minutes + category (no URLs/titles).
function buildPayload(date: string, language: string, aggregate: NonNullable<Awaited<ReturnType<typeof getAggregateForDate>>>) {
  const totalSeconds = aggregate.totalSeconds
  const topDomains = aggregate.topDomains.slice(0, 8).map(d => ({
    domain: d.domain,
    minutes: Math.round(d.seconds / 60),
    category: d.category,
  }))

  return {
    date,
    language,
    aggregate: {
      date,
      totalMinutes: Math.round(totalSeconds / 60),
      productiveMinutes: Math.round(aggregate.productiveSeconds / 60),
      distractionMinutes: Math.round(aggregate.distractionSeconds / 60),
      neutralMinutes: Math.round((aggregate.neutralSeconds + aggregate.uncategorizedSeconds) / 60),
      focusScore: aggregate.focusScore,
      topDomains,
    },
  }
}

function parseJsonObject(body: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(body)
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function parseErrorMessage(body: string): string {
  const error = parseJsonObject(body)?.error
  return typeof error === 'string' ? error : '(no error message)'
}

// Extract the already-stored analysis returned alongside a 429 response.
// A 429 body carries the stored analysis plus ITS OWN score and timestamp —
// the prose was written about that score, so re-stamping it with today's live
// numbers would show text praising a 78 beside a numeral reading 41.
function parseCachedAnalysis(
  body: string,
): { text: string; focusScore: unknown; analyzedAt: number | null } | null {
  const parsed = parseJsonObject(body) as {
    analysis_text?: unknown
    focus_score?: unknown
    analyzed_at?: unknown
  } | null
  const text = parsed?.analysis_text
  if (typeof text !== 'string' || text.length === 0) return null
  const stamp = typeof parsed?.analyzed_at === 'string' ? Date.parse(parsed.analyzed_at) : NaN
  return {
    text,
    focusScore: parsed?.focus_score,
    analyzedAt: Number.isNaN(stamp) ? null : stamp,
  }
}

export async function requestAiAnalysis(date: string, language = 'en'): Promise<AiAnalysisOutcome> {
  const session = await getSession()
  if (!session?.access_token) {
    return { ok: false, reason: 'signed-out' }
  }

  const aggregate = await getAggregateForDate(date)
  if (!aggregate || aggregate.totalSeconds === 0) {
    return { ok: false, reason: 'no-data' }
  }

  const payload = buildPayload(date, language, aggregate)

  let res: Response
  let responseBody: string
  try {
    ;[res, responseBody] = await post(payload, session.access_token)

    // A stored token can be long expired while still looking like a session.
    // Refresh once and retry before deciding the user has to sign in again.
    if (res.status === 401) {
      const refreshed = await refreshSession()
      if (!refreshed?.access_token) {
        return { ok: false, reason: 'session-expired' }
      }
      ;[res, responseBody] = await post(payload, refreshed.access_token)
      if (res.status === 401) {
        return { ok: false, reason: 'session-expired' }
      }
    }
  } catch (err) {
    console.error('[EchoFocus] ai-analyze request failed:', err)
    return { ok: false, reason: 'unavailable' }
  }

  if (!res.ok) {
    // SECURITY: log only the error message — an error body can carry the
    // stored analysis text, which is user data.
    console.error('[EchoFocus] ai-analyze error:', res.status, parseErrorMessage(responseBody))
    // 429 = daily generation cap reached. The Edge Function still returns the
    // analysis already stored for today — surface it as the result.
    if (res.status === 429) {
      const cached = parseCachedAnalysis(responseBody)
      if (cached !== null) {
        // Older function deployments send only the text — fall back to the
        // live score and now rather than refusing the analysis outright.
        const result = validateAiAnalysisResult({
          analysisText: cached.text,
          focusScore: cached.focusScore ?? payload.aggregate.focusScore,
          analyzedAt: cached.analyzedAt ?? Date.now(),
        })
        if (result) return { ok: true, result }
      }
    }
    return { ok: false, reason: 'unavailable' }
  }

  const raw = parseJsonObject(responseBody) as { analysis_text?: unknown; focus_score?: unknown } | null
  const result = validateAiAnalysisResult({
    analysisText: raw?.analysis_text,
    focusScore: raw?.focus_score,
    analyzedAt: Date.now(),
  })
  return result ? { ok: true, result } : { ok: false, reason: 'unavailable' }
}

async function post(payload: unknown, accessToken: string): Promise<[Response, string]> {
  const res = await fetch(`${FUNCTIONS_URL}/ai-analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  return [res, await res.text()]
}
