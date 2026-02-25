import type { AiAnalysisResult } from '@echofocus/shared'
import { getSession } from './auth'
import { getAggregateForDate } from '../background/storage'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string

// Build the anonymized payload for the AI Edge Function.
// Converts seconds → minutes; includes ONLY domain + minutes + category (no URLs/titles).
function buildPayload(date: string, aggregate: NonNullable<Awaited<ReturnType<typeof getAggregateForDate>>>) {
  const totalSeconds = aggregate.totalSeconds
  const topDomains = aggregate.topDomains.slice(0, 8).map(d => ({
    domain: d.domain,
    minutes: Math.round(d.seconds / 60),
    category: d.category,
  }))

  return {
    date,
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

// Request AI analysis for a given date.
// Returns null if the user is not signed in, there is no local aggregate, or the Edge Function fails.
export async function requestAiAnalysis(date: string): Promise<AiAnalysisResult | null> {
  console.log('[EchoFocus] AI analysis: starting for', date)
  console.log('[EchoFocus] AI analysis: FUNCTIONS_URL =', FUNCTIONS_URL || '(empty!)')

  // Gate 1: auth
  const session = await getSession()
  if (!session?.access_token) {
    console.warn('[EchoFocus] AI analysis: BLOCKED — no session. Sign in via Options → 帳戶.')
    return null
  }
  console.log('[EchoFocus] AI analysis: session OK, user =', session.user?.email)

  // Gate 2: local aggregate data
  const aggregate = await getAggregateForDate(date)
  console.log('[EchoFocus] AI analysis: aggregate =', aggregate
    ? `totalSeconds=${aggregate.totalSeconds}, focusScore=${aggregate.focusScore}`
    : 'null (no stored aggregate for ' + date + ')')

  if (!aggregate || aggregate.totalSeconds === 0) {
    console.warn('[EchoFocus] AI analysis: BLOCKED — no tracking data for', date)
    return null
  }

  const payload = buildPayload(date, aggregate)
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
      console.error('[EchoFocus] ai-analyze error:', res.status, responseBody)
      return null
    }

    const data = JSON.parse(responseBody) as { analysis_text: string; focus_score: number }
    console.log(
      '[EchoFocus] AI analysis: status=', res.status,
      '| analysis_text length=', data.analysis_text?.length ?? 0,
      '| preview=', data.analysis_text?.slice(0, 60),
    )
    return {
      analysisText: data.analysis_text,
      focusScore: data.focus_score,
      analyzedAt: Date.now(),
    }
  } catch (err) {
    console.error('[EchoFocus] AI analysis fetch error:', err)
    return null
  }
}
