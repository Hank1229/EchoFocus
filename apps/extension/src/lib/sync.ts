import type { DailyAggregate } from '@echofocus/shared'
import { getDateNDaysAgo } from '@echofocus/shared'
import { getSupabaseClient } from './supabase'
import { getSession } from './auth'

const LAST_SYNC_KEY = 'last_sync_at'

// Upsert a DailyAggregate into Supabase synced_aggregates.
// Only anonymized data is sent: domain names + durations + categories.
// Raw URLs and page titles never leave the device.
async function upsertAggregate(aggregate: DailyAggregate, userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from('synced_aggregates').upsert({
    user_id: userId,
    date: aggregate.date,
    total_seconds: aggregate.totalSeconds,
    productive_seconds: aggregate.productiveSeconds,
    distraction_seconds: aggregate.distractionSeconds,
    neutral_seconds: aggregate.neutralSeconds,
    uncategorized_seconds: aggregate.uncategorizedSeconds,
    focus_score: aggregate.focusScore,
    top_domains: aggregate.topDomains,  // { domain, seconds, category } — no URLs
    synced_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,date',
  })

  if (error) {
    console.error(`[EchoFocus] Sync error for ${aggregate.date}:`, error.message)
    return false
  }

  return true
}

// Read a DailyAggregate from chrome.storage.local for a given date.
async function getLocalAggregate(date: string): Promise<DailyAggregate | null> {
  const key = `aggregates:${date}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as DailyAggregate | undefined) ?? null
}

// Sync yesterday's aggregate. Called by the nightly alarm.
export async function syncYesterdayAggregate(): Promise<void> {
  const session = await getSession()
  if (!session) {
    console.log('[EchoFocus] Sync skipped — not signed in')
    return
  }

  const yesterday = getDateNDaysAgo(1)
  const aggregate = await getLocalAggregate(yesterday)
  if (!aggregate) {
    console.log(`[EchoFocus] No aggregate for ${yesterday}, skipping sync`)
    return
  }

  const success = await upsertAggregate(aggregate, session.user.id)
  if (success) {
    await chrome.storage.local.set({ [LAST_SYNC_KEY]: new Date().toISOString() })
    console.log(`[EchoFocus] Synced aggregate for ${yesterday}`)
  }
}

// Sync a specific date's aggregate. Used for manual "立即同步" button.
export async function syncAggregateForDate(date: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: '請先登入' }
  }

  const aggregate = await getLocalAggregate(date)
  if (!aggregate) {
    return { ok: false, message: `找不到 ${date} 的資料` }
  }

  const success = await upsertAggregate(aggregate, session.user.id)
  if (success) {
    await chrome.storage.local.set({ [LAST_SYNC_KEY]: new Date().toISOString() })
    return { ok: true, message: `已同步 ${date} 的資料` }
  }

  return { ok: false, message: '同步失敗，請稍後再試' }
}

export async function getLastSyncTime(): Promise<string | null> {
  const result = await chrome.storage.local.get(LAST_SYNC_KEY)
  return (result[LAST_SYNC_KEY] as string | undefined) ?? null
}
