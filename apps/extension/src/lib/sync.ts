import type { DailyAggregate } from '@echofocus/shared'
import { emptyProductiveByHour, formatLocalDate, getDateNDaysAgo, getTodayDateString } from '@echofocus/shared'
import { getSupabaseClient } from './supabase'
import { getSession } from './auth'
import { aggregateKey, getAggregateForDate, recomputeAndSaveAggregate } from '../background/storage'
import { dailyAggregateSchema } from './schemas'
import { reconcileWithCloud } from './prefs-sync'
import { getPendingSyncDates, enqueueSyncDate, removePendingSyncDate } from './sync-queue'

export { enqueueSyncDate } from './sync-queue'

const LAST_SYNC_KEY = 'last_sync_at'

// How far back a startup catch-up looks for unsynced days. Bounded so a fresh
// install (no last_sync_at at all) probes a month of keys, not a year.
const MAX_BACKFILL_DAYS = 30

// First sign-in carries the WHOLE local archive up: aggregates are kept 365
// days locally, and someone who tried the product for two months before
// creating an account must not lose that history to the 30-day catch-up.
const MAX_HISTORY_DAYS = 365
const HISTORY_BATCH_SIZE = 50
// Per-user marker, set only after a clean full pass — an interrupted backfill
// simply reruns on the next sign-in or startup (upserts are idempotent).
const HISTORY_BACKFILLED_KEY = 'history_backfilled_user'

// Only anonymized data is sent: domain names + durations + categories.
// Raw URLs and page titles never leave the device.
function aggregateRow(aggregate: DailyAggregate, userId: string): Record<string, unknown> {
  return {
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
  }
}

async function upsertAggregates(aggregates: DailyAggregate[], userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const rows = aggregates.map(a => aggregateRow(a, userId))
  const { error } = await supabase.from('synced_aggregates').upsert(
    rows.length === 1 ? rows[0] : rows,
    { onConflict: 'user_id,date' },
  )
  if (error) {
    console.error(`[EchoFocus] Sync error for ${aggregates[0]?.date}…(${aggregates.length}):`, error.message)
    return false
  }
  return true
}

async function upsertAggregate(aggregate: DailyAggregate, userId: string): Promise<boolean> {
  return upsertAggregates([aggregate], userId)
}

// ─── Pending Sync Queue ────────────────────────────────────────────────────

// Durable retry queue: a date stays in `pending_sync_dates` until its
// aggregate has been CONFIRMED upserted. Failed days are retried on the
// next drain (nightly alarm or browser startup) instead of being lost.
// enqueueSyncDate/removePendingSyncDate/getPendingSyncDates live in
// ./sync-queue — see that file for why.

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

// Catch up on days the nightly alarm never got to run for: the 00:05 alarm
// only fires if Chrome happens to be running at 00:05, and even when it does
// it enqueues yesterday alone. Someone who keeps the browser closed overnight
// would otherwise lose every one of those days silently.
export async function enqueueMissedSyncDates(): Promise<void> {
  const lastSync = await getLastSyncTime()
  // ISO dates compare lexicographically. The day of the last successful sync
  // is re-enqueued on purpose — it may have been synced mid-day, and the
  // upsert is idempotent.
  const earliest = lastSync ? formatLocalDate(new Date(lastSync)) : null

  const candidates: string[] = []
  for (let daysAgo = 1; daysAgo <= MAX_BACKFILL_DAYS; daysAgo++) {
    const date = getDateNDaysAgo(daysAgo)
    if (earliest !== null && date < earliest) break
    candidates.push(date)
  }
  if (candidates.length === 0) return

  // One batched read for the whole window instead of up to 30 sequential IPC
  // round-trips on every browser start. Presence is enough to enqueue — the
  // drain re-reads and validates each aggregate before uploading anyway.
  const stored = await chrome.storage.local.get(candidates.map(aggregateKey))
  for (const date of candidates) {
    if (stored[aggregateKey(date)] !== undefined) {
      await enqueueSyncDate(date)
    }
  }
}

// One-time full-history upload for an account that has never seen this
// device's archive. Bypasses the retry queue on purpose — the queue caps at
// 60 dates and would silently drop most of a year. Failed batches fall back
// to the queue for near-term retry, and because the marker is only written
// after a clean pass, the next sign-in or startup reruns the whole scan.
export async function backfillHistoryIfNeeded(): Promise<{ backfilled: number; failed: number } | null> {
  const session = await getSession()
  if (!session) return null
  const userId = session.user.id

  const marker = await chrome.storage.local.get(HISTORY_BACKFILLED_KEY)
  if (marker[HISTORY_BACKFILLED_KEY] === userId) return { backfilled: 0, failed: 0 }

  const dates: string[] = []
  for (let daysAgo = 0; daysAgo <= MAX_HISTORY_DAYS; daysAgo++) {
    dates.push(getDateNDaysAgo(daysAgo))
  }
  // One batched read for the whole archive instead of 365 IPC round-trips.
  const stored = await chrome.storage.local.get(dates.map(aggregateKey))

  const aggregates: DailyAggregate[] = []
  for (const date of dates) {
    const raw = stored[aggregateKey(date)]
    if (raw === undefined) continue
    const parsed = dailyAggregateSchema.safeParse(raw)
    if (parsed.success) aggregates.push(parsed.data)
    else console.warn(`[EchoFocus] Skipping malformed aggregate during backfill: ${date}`)
  }

  let backfilled = 0
  let failed = 0
  for (let i = 0; i < aggregates.length; i += HISTORY_BATCH_SIZE) {
    const batch = aggregates.slice(i, i + HISTORY_BATCH_SIZE)
    if (await upsertAggregates(batch, userId)) {
      backfilled += batch.length
    } else {
      failed += batch.length
      for (const a of batch) await enqueueSyncDate(a.date)
    }
  }

  if (failed === 0) {
    await chrome.storage.local.set({ [HISTORY_BACKFILLED_KEY]: userId })
    if (backfilled > 0) {
      await chrome.storage.local.set({ [LAST_SYNC_KEY]: new Date().toISOString() })
    }
  }
  return { backfilled, failed }
}

// Everything the moment of signing in owes the user: the rules/preferences
// first-contact merge, the full local history, and any queued days — so a
// try-first-register-later account starts from everything, not from zero.
export async function postSignInBootstrap(): Promise<{ backfilled: number; failed: number } | null> {
  await reconcileWithCloud()
  const result = await backfillHistoryIfNeeded()
  await drainSyncQueue()
  return result
}

// Nightly sync: enqueue yesterday, bring rules and preferences back in line
// with the cloud, then drain the whole queue (including any previously failed
// days).
export async function syncYesterdayAggregate(): Promise<void> {
  await enqueueSyncDate(getDateNDaysAgo(1))
  await reconcileWithCloud()
  await drainSyncQueue()
}

// Sync a specific date's aggregate. Used for the manual "Sync now" button.
export async function syncAggregateForDate(date: string): Promise<{ ok: boolean; message: string }> {
  const session = await getSession()
  if (!session) {
    return { ok: false, message: 'Please sign in first' }
  }

  // "Sync now" is a user asking for everything to line up, not just today's
  // numbers — same reconcile the nightly alarm runs.
  await reconcileWithCloud()

  // The stored aggregate only reflects the last hourly alarm; today's live
  // session isn't folded in until something recomputes it. Only today,
  // though — entries outside the retention window are pruned while
  // aggregates are kept 365 days, so recomputing any other date would
  // rebuild it from zero entries and overwrite the real numbers with zeros.
  if (date === getTodayDateString()) {
    await recomputeAndSaveAggregate(date)
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
