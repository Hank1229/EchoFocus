import { createClient } from '@/lib/supabase/client'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const AGGREGATE_COLUMNS =
  'total_seconds, productive_seconds, distraction_seconds, neutral_seconds, uncategorized_seconds, focus_score, top_domains'

interface SyncedAggregateRow {
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
  top_domains: { domain: string; seconds: number; category: string }[] | null
}

interface AggregatePayload {
  date: string
  totalMinutes: number
  productiveMinutes: number
  distractionMinutes: number
  neutralMinutes: number
  focusScore: number
  topDomains: { domain: string; minutes: number; category: string }[]
}

function toAggregatePayload(date: string, row: SyncedAggregateRow): AggregatePayload {
  return {
    date,
    totalMinutes: Math.round(row.total_seconds / 60),
    productiveMinutes: Math.round(row.productive_seconds / 60),
    distractionMinutes: Math.round(row.distraction_seconds / 60),
    neutralMinutes: Math.round((row.neutral_seconds + row.uncategorized_seconds) / 60),
    focusScore: row.focus_score,
    topDomains: (row.top_domains ?? []).slice(0, 8).map(d => ({
      domain: d.domain,
      minutes: Math.round(d.seconds / 60),
      category: d.category,
    })),
  }
}

export type AiAnalysisOutcome =
  | { status: 'success'; analysisText: string; focusScore: number }
  // Daily generation cap reached (429) — the Edge Function returns the
  // analysis already stored for today, which is still worth showing.
  | { status: 'cached'; analysisText: string; focusScore: number }
  | { status: 'error'; reason: 'not-signed-in' | 'no-data' | 'request-failed'; message?: string }

/**
 * POST a validated payload to the ai-analyze Edge Function.
 * `cachedFocusScore` is used when the generation cap (429) makes the function
 * return a previously stored analysis, which carries no score of its own.
 */
async function postAnalysis(
  payload: Record<string, unknown>,
  accessToken: string,
  cachedFocusScore: number,
): Promise<AiAnalysisOutcome> {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_FUNCTIONS_URL}/ai-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
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
      return { status: 'cached', analysisText: parsed.analysis_text, focusScore: cachedFocusScore }
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
    .select(AGGREGATE_COLUMNS)
    .eq('user_id', session.user.id)
    .eq('date', date)
    .maybeSingle()

  if (aggError) return { status: 'error', reason: 'request-failed', message: aggError.message }
  if (!data) return { status: 'error', reason: 'no-data' }
  const agg = data as SyncedAggregateRow

  return postAnalysis(
    { date, language, aggregate: toAggregatePayload(date, agg) },
    session.access_token,
    agg.focus_score,
  )
}

/**
 * Request a weekly retrospective over the user's 7 most recently synced days.
 * Capped server-side at one generation per calendar week; once capped the
 * stored weekly summary comes back as `cached`.
 */
export async function requestWeeklyAnalysis(language: string): Promise<AiAnalysisOutcome> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { status: 'error', reason: 'not-signed-in' }

  const { data, error: aggError } = await supabase
    .from('synced_aggregates')
    .select(`date, ${AGGREGATE_COLUMNS}`)
    .eq('user_id', session.user.id)
    .order('date', { ascending: false })
    .limit(7)

  if (aggError) return { status: 'error', reason: 'request-failed', message: aggError.message }
  const rows = (data ?? []) as (SyncedAggregateRow & { date: string })[]
  if (rows.length === 0) return { status: 'error', reason: 'no-data' }

  // Oldest first, so the Edge Function stores the summary under the latest date.
  const aggregates = rows.map(row => toAggregatePayload(row.date, row)).reverse()
  const averageFocusScore = Math.round(
    aggregates.reduce((sum, day) => sum + day.focusScore, 0) / aggregates.length,
  )

  return postAnalysis({ type: 'weekly', language, aggregates }, session.access_token, averageFocusScore)
}
