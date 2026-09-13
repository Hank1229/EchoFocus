import type { DailyAggregate } from '@echofocus/shared'
import { emptyProductiveByHour, getDateNDaysAgo } from '@echofocus/shared'
import { getSupabaseClient } from './supabase'
import { getSession } from './auth'
import { getAggregateForDate, withStorageLock } from '../background/storage'

const LAST_SYNC_KEY = 'last_sync_at'
const PENDING_SYNC_KEY = 'pending_sync_dates'

// Never let the retry queue grow unbounded — keep the most recent dates.
const MAX_PENDING_DATES = 60

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
    // 24 productive-second counts, nothing attached to them. Days recorded
    // before the hourly breakdown shipped sync as zeros, matching the column
    // default rather than leaving the row's old value behind.
    productive_by_hour: aggregate.productiveByHour ?? emptyProductiveByHour(),
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

// ─── Pending Sync Queue ────────────────────────────────────────────────────

// Durable retry queue: a date stays in `pending_sync_dates` until its
// aggregate has been CONFIRMED upserted. Failed days are retried on the
// next drain (nightly alarm or browser startup) instead of being lost.

async function getPendingSyncDates(): Promise<string[]> {
  const result = await chrome.storage.local.get(PENDING_SYNC_KEY)
  const raw = result[PENDING_SYNC_KEY]
  if (!Array.isArray(raw)) return []
  return raw.filter((d): d is string => typeof d === 'string')
}

export async function enqueueSyncDate(date: string): Promise<void> {
  await withStorageLock(async () => {
    const pending = await getPendingSyncDates()
    if (!pending.includes(date)) pending.push(date)
    // Cap the queue — drop the oldest dates beyond the limit
    const capped = pending.sort().slice(-MAX_PENDING_DATES)
    await chrome.storage.local.set({ [PENDING_SYNC_KEY]: capped })
  })
}

async function removePendingSyncDate(date: string): Promise<void> {
  await withStorageLock(async () => {
    const pending = await getPendingSyncDates()
    await chrome.storage.local.set({ [PENDING_SYNC_KEY]: pending.filter((d) => d !== date) })
  })
}

// Try to sync every queued date. A date is removed only after a confirmed
// upsert (or when no local aggregate exists for it at all).
export async function drainSyncQueue(): Promise<void> {
  const pending = await getPendingSyncDates()
  if (pending.length === 0) return

  const session = await getSession()
  if (!session) {
    console.log('[EchoFocus] Sync drain skipped — not signed in (dates stay queued)')
    return
  }

  let anySuccess = false
  for (const date of pending) {
    try {
      const aggregate = await getAggregateForDate(date)
      if (!aggregate) {
        // Nothing to sync for this day — drop it so the queue can't clog
        console.log(`[EchoFocus] No aggregate for ${date}, removing from sync queue`)
        await removePendingSyncDate(date)
        continue
      }

      const success = await upsertAggregate(aggregate, session.user.id)
      if (success) {
        await removePendingSyncDate(date)
        anySuccess = true
        console.log(`[EchoFocus] Synced aggregate for ${date}`)
      }
      // On failure the date stays queued for the next drain
    } catch (err) {
      console.error(`[EchoFocus] Sync attempt failed for ${date}:`, err)
    }
  }

  if (anySuccess) {
    await chrome.storage.local.set({ [LAST_SYNC_KEY]: new Date().toISOString() })
  }
}

// Nightly sync: enqueue yesterday, then drain the whole queue (including
// any previously failed days).
export async function syncYesterdayAggregate(): Promise<void> {
  await enqueueSyncDate(getDateNDaysAgo(1))
  await drainSyncQueue()
}

// Sync a specific date's aggregate. Used for the manual "Sync now" button.
export async function syncAggregateForDate(date: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: 'Please sign in first' }
  }

  const aggregate = await getAggregateForDate(date)
  if (!aggregate) {
    return { ok: false, message: `No data found for ${date}` }
  }

  const success = await upsertAggregate(aggregate, session.user.id)
  if (success) {
    await chrome.storage.local.set({ [LAST_SYNC_KEY]: new Date().toISOString() })
    await removePendingSyncDate(date)
    return { ok: true, message: `Synced data for ${date}` }
  }

  // Queue the date so the nightly drain retries it
  await enqueueSyncDate(date)
  return { ok: false, message: 'Sync failed, please try again' }
}

export async function getLastSyncTime(): Promise<string | null> {
  const result = await chrome.storage.local.get(LAST_SYNC_KEY)
  return (result[LAST_SYNC_KEY] as string | undefined) ?? null
}
