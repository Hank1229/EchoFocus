import { withStorageLock } from '../background/storage'

// Durable retry queue: a date stays here until its aggregate has been
// CONFIRMED synced (see drainSyncQueue in sync.ts). Split out of sync.ts so a
// date can be enqueued from background/tracker.ts without importing sync.ts
// itself — sync.ts pulls in prefs-sync.ts, which pulls in background/settings.ts,
// which imports tracker.ts, so tracker.ts -> sync.ts would be a circular import.
const PENDING_SYNC_KEY = 'pending_sync_dates'

// Never let the retry queue grow unbounded — keep the most recent dates.
const MAX_PENDING_DATES = 60

export async function getPendingSyncDates(): Promise<string[]> {
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

export async function removePendingSyncDate(date: string): Promise<void> {
  await withStorageLock(async () => {
    const pending = await getPendingSyncDates()
    await chrome.storage.local.set({ [PENDING_SYNC_KEY]: pending.filter((d) => d !== date) })
  })
}
