import { createClient } from '@/lib/supabase/client'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

interface SyncedAggregateRow {
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
  top_domains: { domain: string; seconds: number; category: string }[] | null
}

export type AiAnalysisOutcome =
  | { status: 'success'; analysisText: string; focusScore: number }
  // Daily generation cap reached (429) — the Edge Function returns the
  // analysis already stored for today, which is still worth showing.
  | { status: 'cached'; analysisText: string; focusScore: number }
  | { status: 'error'; reason: 'not-signed-in' | 'no-data' | 'request-failed'; message?: string }

/**
 * Fetch the synced aggregate for `date` and request an AI analysis for it.
 * Shared by the Today insight card and the AI Insights page.
 */
export async function requestAiAnalysis(date: string, language: string): Promise<AiAnalysisOutcome> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { status: 'error', reason: 'not-signed-in' }

  const { data, error: aggError } = await supabase
    .from('synced_aggregates')
    .select('total_seconds, productive_seconds, distraction_seconds, neutral_seconds, uncategorized_seconds, focus_score, top_domains')
    .eq('user_id', session.user.id)
    .eq('date', date)
    .maybeSingle()

  if (aggError) return { status: 'error', reason: 'request-failed', message: aggError.message }
  if (!data) return { status: 'error', reason: 'no-data' }
  const agg = data as SyncedAggregateRow

  const payload = {
    date,
    language,
    aggregate: {
      date,
      totalMinutes: Math.round(agg.total_seconds / 60),
      productiveMinutes: Math.round(agg.productive_seconds / 60),
      distractionMinutes: Math.round(agg.distraction_seconds / 60),
      neutralMinutes: Math.round((agg.neutral_seconds + agg.uncategorized_seconds) / 60),
      focusScore: agg.focus_score,
      topDomains: (agg.top_domains ?? []).slice(0, 8).map(d => ({
        domain: d.domain,
        minutes: Math.round(d.seconds / 60),
        category: d.category,
      })),
    },
  }

  let res: Response
  try {
    res = await fetch(`${SUPABASE_FUNCTIONS_URL}/ai-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return {
      status: 'error',
      reason: 'request-failed',
      message: err instanceof Error ? err.message : undefined,
    }
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    const parsed = (typeof body === 'object' && body !== null ? body : {}) as {
      error?: unknown
      analysis_text?: unknown
    }
    if (res.status === 429 && typeof parsed.analysis_text === 'string' && parsed.analysis_text.length > 0) {
      return { status: 'cached', analysisText: parsed.analysis_text, focusScore: agg.focus_score }
    }
    return {
      status: 'error',
      reason: 'request-failed',
      // statusText is '' over HTTP/2 — leave message undefined so callers
      // fall back to their localized generic error
      message: (typeof parsed.error === 'string' && parsed.error.length > 0
        ? parsed.error
        : res.statusText) || undefined,
    }
  }

  let result: { analysis_text: string; focus_score: number }
  try {
    result = await res.json() as { analysis_text: string; focus_score: number }
  } catch {
    return { status: 'error', reason: 'request-failed' }
  }
  return { status: 'success', analysisText: result.analysis_text, focusScore: result.focus_score }
}
