import { getDateNDaysAgo } from '@echofocus/shared'
import { createClient } from '@/lib/supabase/client'

// Every column of the row, so the download is the row: the aggregate's
// uncategorized time, site list and hourly breakdown, and the analysis's
// type (a day can hold a daily and a weekly one).
export const AGGREGATE_EXPORT_COLUMNS =
  'date, total_seconds, productive_seconds, distraction_seconds, neutral_seconds, uncategorized_seconds, focus_score, top_domains, productive_by_hour'
export const ANALYSIS_EXPORT_COLUMNS = 'date, type, analysis_text, focus_score, created_at'

export interface CloudExport {
  exported_at: string
  range: 'last_30_days'
  synced_aggregates: unknown[]
  ai_analyses: unknown[]
}

export type CloudExportOutcome =
  | { ok: true; data: CloudExport }
  | { ok: false; message: string }

// The user's last 30 days of synced rows, or why they could not be read. A
// failed query must come back as a failure: a download holding two empty
// arrays looks like a successful backup of nothing.
export async function fetchCloudExport(userId: string, now = new Date()): Promise<CloudExportOutcome> {
  const supabase = createClient()
  // Today and the 29 days before it on the user's local calendar — the days
  // are keyed by the extension's local dates, so never a UTC date here.
  const since = getDateNDaysAgo(29, now)

  const [aggregates, analyses] = await Promise.all([
    supabase.from('synced_aggregates').select(AGGREGATE_EXPORT_COLUMNS).eq('user_id', userId).gte('date', since).order('date', { ascending: false }),
    supabase.from('ai_analyses').select(ANALYSIS_EXPORT_COLUMNS).eq('user_id', userId).gte('date', since).order('date', { ascending: false }),
  ])

  const failed = aggregates.error ?? analyses.error
  if (failed) return { ok: false, message: failed.message }

  return {
    ok: true,
    data: {
      exported_at: now.toISOString(),
      range: 'last_30_days',
      synced_aggregates: aggregates.data ?? [],
      ai_analyses: analyses.data ?? [],
    },
  }
}
