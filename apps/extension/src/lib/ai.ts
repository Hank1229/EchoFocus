import type { AiAnalysisResult } from '@echofocus/shared'
import { getSession } from './auth'
import { validateAiAnalysisResult } from './schemas'
import { getAggregateForDate } from '../background/storage'

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
function parseCachedAnalysis(body: string): string | null {
  const text = parseJsonObject(body)?.analysis_text
  return typeof text === 'string' && text.length > 0 ? text : null
}

// Request AI analysis for a given date.
// Returns null if the user is not signed in, there is no local aggregate, or the Edge Function fails.
export async function requestAiAnalysis(date: string, language = 'en'): Promise<AiAnalysisResult | null> {
  console.log('[EchoFocus] AI analysis: starting for', date)
  console.log('[EchoFocus] AI analysis: FUNCTIONS_URL =', FUNCTIONS_URL || '(empty!)')

  // Gate 1: auth
  const session = await getSession()
  if (!session?.access_token) {
    console.warn('[EchoFocus] AI analysis: BLOCKED — no session. Sign in via Options → Account.')
    return null
  }

  // Gate 2: local aggregate data
  const aggregate = await getAggregateForDate(date)
  console.log('[EchoFocus] AI analysis: aggregate =', aggregate
    ? `totalSeconds=${aggregate.totalSeconds}, focusScore=${aggregate.focusScore}`
    : 'null (no stored aggregate for ' + date + ')')

  if (!aggregate || aggregate.totalSeconds === 0) {
    console.warn('[EchoFocus] AI analysis: BLOCKED — no tracking data for', date)
    return null
  }

  const payload = buildPayload(date, language, aggregate)
  console.log('[EchoFocus] AI analysis: sending fetch to', `${FUNCTIONS_URL}/ai-analyze`)

  try {
    const res = await fetch(`${FUNCTIONS_URL}/ai-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })

    // Always consume the response body
    const responseBody = await res.text()

    if (!res.ok) {
      // SECURITY: log only the error message — an error body can carry the
      // stored analysis text, which is user data.
      console.error('[EchoFocus] ai-analyze error:', res.status, parseErrorMessage(responseBody))
      // 429 = daily generation cap reached. The Edge Function still returns
      // the analysis already stored for today — surface it as the result.
      if (res.status === 429) {
        const cached = parseCachedAnalysis(responseBody)
        if (cached !== null) {
          return validateAiAnalysisResult({
            analysisText: cached,
            focusScore: payload.aggregate.focusScore,
            analyzedAt: Date.now(),
          })
        }
      }
      return null
    }

    const data: unknown = JSON.parse(responseBody)
    const raw = data as { analysis_text?: unknown; focus_score?: unknown }
    // SECURITY: do not log the analysis text — treat AI output as user data.
    console.log('[EchoFocus] AI analysis: status=', res.status,
      '| analysis_text length=', typeof raw.analysis_text === 'string' ? raw.analysis_text.length : 0)
    return validateAiAnalysisResult({
      analysisText: raw.analysis_text,
      focusScore: raw.focus_score,
      analyzedAt: Date.now(),
    })
  } catch (err) {
    console.error('[EchoFocus] AI analysis fetch error:', err)
    return null
  }
}
