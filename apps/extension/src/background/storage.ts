import type { TrackingEntry, DailyAggregate, TrackingState, Settings, AiAnalysisResult } from '@echofocus/shared'
import type { ClassificationRule } from '@echofocus/shared'
import { DEFAULT_SETTINGS, aggregateEntries, getTodayDateString, getDateNDaysAgo } from '@echofocus/shared'
import {
  trackingEntryArraySchema,
  dailyAggregateSchema,
  trackingStateSchema,
  settingsSchema,
  classificationRuleArraySchema,
  aiAnalysisResultSchema,
} from '../lib/schemas'

// ─── Storage Key Helpers ───────────────────────────────────────────────────

function entriesKey(date: string): string {
  return `entries:${date}`
}

export function aggregateKey(date: string): string {
  return `aggregates:${date}`
}

const TRACKING_STATE_KEY = 'tracking_state'
const SETTINGS_KEY = 'settings'
const CUSTOM_RULES_KEY = 'custom_rules'
const AI_ANALYSIS_KEY_PREFIX = 'ai_analysis:'
const LAST_SEEN_AT_KEY = 'last_seen_at'
export const STORAGE_FULL_KEY = 'storage_full_at'

// ─── Write Serialization ───────────────────────────────────────────────────

// Simple promise-chain mutex. All read-modify-write operations on
// chrome.storage.local go through this so concurrent event handlers can't
// interleave a get/set pair and lose writes.
let storageQueue: Promise<unknown> = Promise.resolve()

export function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = storageQueue.then(fn, fn)
  // Keep the chain alive even if fn rejects
  storageQueue = next.catch(() => undefined)
  return next
}

// ─── Quota Guard ───────────────────────────────────────────────────────────

// Entries and aggregates are the only writes big enough to fill the 5MB
// quota, so this guard sits on that one choke point. Unguarded, a full quota
// rejected every set(), the rejection escaped the async event listener
// unhandled, and tracking stopped for good while the popup kept counting.

// A quota-triggered prune has to actually free something. Retention can be set
// to 365 days, which makes cleanupOldData() a no-op on a storage that is full
// of the last 365 days — so the emergency pass ignores the user's setting and
// keeps at most this many days.
const EMERGENCY_RETENTION_DAYS = 90

// Chrome has worded this "QUOTA_BYTES quota exceeded" and
// "Resource::kQuotaBytes quota exceeded" across versions, and surfaces it as a
// promise rejection or via runtime.lastError depending on the call style.
function isQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return /quota/i.test(message) || /quota/i.test(chrome.runtime.lastError?.message ?? '')
}

// Mirrors the persisted flag. null until something reads it back: the badge
// outlives the service worker, so a fresh worker has to look before it may
// conclude there is nothing to clear.
let storageFull: boolean | null = null

async function markStorageFull(): Promise<void> {
  storageFull = true
  await chrome.action.setBadgeText({ text: '!' })
  await chrome.action.setBadgeBackgroundColor({ color: '#f43f5e' })
  console.error('[EchoFocus] Storage full — dropping writes until space is freed')
  // The flag is a couple of dozen bytes, but a storage that just refused an
  // entry can refuse those too. The badge is the signal that must not depend
  // on it, so this write comes last and is allowed to fail.
  await chrome.storage.local.set({ [STORAGE_FULL_KEY]: Date.now() }).catch(() => undefined)
}

async function clearStorageFull(): Promise<void> {
  if (storageFull === null) {
    const flagged = await chrome.storage.local.get(STORAGE_FULL_KEY)
    storageFull = flagged[STORAGE_FULL_KEY] !== undefined
  }
  if (!storageFull) return

  storageFull = false
  await chrome.storage.local.remove(STORAGE_FULL_KEY)
  await chrome.action.setBadgeText({ text: '' })
}

// Write, and on a full quota prune hard and try once more. A write that still
// fails is dropped rather than thrown — losing one entry beats killing the
// listener — but the badge and the flag make the loss visible.
async function setGuarded(items: Record<string, unknown>): Promise<void> {
  try {
    await chrome.storage.local.set(items)
  } catch (err) {
    if (!isQuotaError(err)) throw err
    await cleanupOldData(EMERGENCY_RETENTION_DAYS)
    try {
      await chrome.storage.local.set(items)
    } catch (retryErr) {
      if (!isQuotaError(retryErr)) throw retryErr
      await markStorageFull()
      return
    }
  }
  await clearStorageFull()
}

// ─── TrackingEntry Operations ──────────────────────────────────────────────

// url and title exist only for the local export — they never leave the device
// — so clamping them costs the user nothing and keeps one pathological URL
// (data: links, tracking params by the thousand) from eating the quota.
export const MAX_URL_LENGTH = 512
export const MAX_TITLE_LENGTH = 256

export async function getEntriesForDate(date: string): Promise<TrackingEntry[]> {
  const key = entriesKey(date)
  const result = await chrome.storage.local.get(key)
  if (result[key] === undefined) return []
  const parsed = trackingEntryArraySchema.safeParse(result[key])
  if (!parsed.success) {
    console.warn(`[EchoFocus] Invalid entries for ${date}, ignoring:`, parsed.error.message)
    return []
  }
  return parsed.data
}

export async function saveEntry(entry: TrackingEntry): Promise<void> {
  const bounded: TrackingEntry = {
    ...entry,
    url: entry.url.slice(0, MAX_URL_LENGTH),
    title: entry.title.slice(0, MAX_TITLE_LENGTH),
  }
  await withStorageLock(async () => {
    const key = entriesKey(bounded.date)
    const existing = await getEntriesForDate(bounded.date)
    await setGuarded({ [key]: [...existing, bounded] })
  })
}

// ─── DailyAggregate Operations ────────────────────────────────────────────

export async function getAggregateForDate(date: string): Promise<DailyAggregate | null> {
  const key = aggregateKey(date)
  const result = await chrome.storage.local.get(key)
  if (result[key] === undefined) return null
  const parsed = dailyAggregateSchema.safeParse(result[key])
  if (!parsed.success) {
    console.warn(`[EchoFocus] Invalid aggregate for ${date}, ignoring:`, parsed.error.message)
    return null
  }
  return parsed.data
}

export async function recomputeAndSaveAggregate(date: string): Promise<DailyAggregate> {
  return withStorageLock(async () => {
    const entries = await getEntriesForDate(date)
    const aggregate = aggregateEntries(entries, date)
    await setGuarded({ [aggregateKey(date)]: aggregate })
    return aggregate
  })
}

// ─── TrackingState Operations ──────────────────────────────────────────────

const DEFAULT_TRACKING_STATE: TrackingState = {
  isTracking: true,
  isIdle: false,
  activeTabId: null,
  activeDomain: null,
  activeUrl: null,
  activeTitle: null,
  activeCategory: null,
  sessionStartTime: null,
}

export async function getTrackingState(): Promise<TrackingState> {
  const result = await chrome.storage.local.get(TRACKING_STATE_KEY)
  if (result[TRACKING_STATE_KEY] === undefined) return { ...DEFAULT_TRACKING_STATE }
  const parsed = trackingStateSchema.safeParse(result[TRACKING_STATE_KEY])
  if (!parsed.success) {
    console.warn('[EchoFocus] Invalid tracking state, using defaults:', parsed.error.message)
    return { ...DEFAULT_TRACKING_STATE }
  }
  return parsed.data
}

// Persists the state AND refreshes the heartbeat timestamp in one write —
// every state change proves the service worker was alive at this moment.
// Guarded: this runs on every tab/window/idle event, so on a full quota an
// unguarded rejection here would kill tracking through the exact hole the
// entry-path guard was built to close.
export async function saveTrackingState(state: TrackingState): Promise<void> {
  await withStorageLock(async () => {
    await setGuarded({
      [TRACKING_STATE_KEY]: state,
      [LAST_SEEN_AT_KEY]: Date.now(),
    })
  })
}

// ─── Heartbeat (lastSeenAt) ────────────────────────────────────────────────

// The heartbeat alarm updates this every minute. On service-worker restore,
// a dangling session is finalized at min(now, lastSeenAt + grace) so that
// hours of sleep/shutdown are never credited as browsing time.
export async function getLastSeenAt(): Promise<number | null> {
  const result = await chrome.storage.local.get(LAST_SEEN_AT_KEY)
  const value = result[LAST_SEEN_AT_KEY]
  return typeof value === 'number' ? value : null
}

export async function saveLastSeenAt(timestamp: number): Promise<void> {
  await setGuarded({ [LAST_SEEN_AT_KEY]: timestamp })
}

// ─── Settings Operations ───────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY)
  if (result[SETTINGS_KEY] === undefined) return { ...DEFAULT_SETTINGS }
  // Merge before validating — stored settings may legitimately be partial
  // (older versions saved fewer fields).
  const merged = { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] as Record<string, unknown>) }
  const parsed = settingsSchema.safeParse(merged)
  if (!parsed.success) {
    console.warn('[EchoFocus] Invalid settings, using defaults:', parsed.error.message)
    return { ...DEFAULT_SETTINGS }
  }
  return parsed.data
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  await withStorageLock(async () => {
    const current = await getSettings()
    await setGuarded({ [SETTINGS_KEY]: { ...current, ...settings } })
  })
}

// ─── Custom Rules Operations ───────────────────────────────────────────────

export async function getCustomRules(): Promise<ClassificationRule[]> {
  const result = await chrome.storage.local.get(CUSTOM_RULES_KEY)
  if (result[CUSTOM_RULES_KEY] === undefined) return []
  const parsed = classificationRuleArraySchema.safeParse(result[CUSTOM_RULES_KEY])
  if (parsed.success) return parsed.data

  // Salvage the valid rules instead of dropping the whole list
  if (Array.isArray(result[CUSTOM_RULES_KEY])) {
    const salvaged: ClassificationRule[] = []
    for (const item of result[CUSTOM_RULES_KEY] as unknown[]) {
      const rule = classificationRuleArraySchema.element.safeParse(item)
      if (rule.success) salvaged.push(rule.data)
    }
    console.warn(`[EchoFocus] Dropped ${(result[CUSTOM_RULES_KEY] as unknown[]).length - salvaged.length} invalid custom rules`)
    return salvaged
  }

  console.warn('[EchoFocus] Invalid custom rules, ignoring:', parsed.error.message)
  return []
}

export async function saveCustomRules(rules: ClassificationRule[]): Promise<void> {
  await setGuarded({ [CUSTOM_RULES_KEY]: rules })
}

// ─── AI Analysis Operations ───────────────────────────────────────────────

export async function getAiAnalysis(date: string): Promise<AiAnalysisResult | null> {
  const key = `${AI_ANALYSIS_KEY_PREFIX}${date}`
  const result = await chrome.storage.local.get(key)
  if (result[key] === undefined) return null
  const parsed = aiAnalysisResultSchema.safeParse(result[key])
  if (!parsed.success) {
    console.warn(`[EchoFocus] Invalid AI analysis for ${date}, ignoring:`, parsed.error.message)
    return null
  }
  return parsed.data
}

export async function saveAiAnalysis(date: string, result: AiAnalysisResult): Promise<void> {
  const key = `${AI_ANALYSIS_KEY_PREFIX}${date}`
  await setGuarded({ [key]: result })
}

// ─── Data Retention Cleanup ────────────────────────────────────────────────

// Remove entries older than retentionDays, keep aggregates for 365 days.
// maxDays caps every window for one pass — the quota guard passes it so an
// emergency prune frees space even when the user's retention is set to a year.
export async function cleanupOldData(maxDays = Infinity): Promise<void> {
  const settings = await getSettings()
  const retentionDays = Math.min(settings.dataRetentionDays, maxDays)
  const aggregateDays = Math.min(365, maxDays)
  const aiAnalysisDays = Math.min(90, maxDays)
  const allData = await chrome.storage.local.get(null)
  const keysToRemove: string[] = []

  // Cutoffs as YYYY-MM-DD strings, compared lexicographically against the key's
  // date — not `new Date(dateStr).getTime()` diffed against `Date.now()`.
  // `new Date('YYYY-MM-DD')` parses as UTC midnight, so diffing it against the
  // local "now" instant drifted the retention boundary by the local UTC offset
  // (up to half a day) depending on both the timezone and the time of day
  // cleanup happened to run. String keys and getCutoffDate are both local-date
  // based, so the comparison is exact everywhere.
  const entriesCutoff = getCutoffDate(retentionDays)
  const aggregatesCutoff = getCutoffDate(aggregateDays)
  const aiAnalysisCutoff = getCutoffDate(aiAnalysisDays)

  for (const key of Object.keys(allData)) {
    if (key.startsWith('entries:')) {
      if (key.slice('entries:'.length) < entriesCutoff) keysToRemove.push(key)
    } else if (key.startsWith('aggregates:')) {
      if (key.slice('aggregates:'.length) < aggregatesCutoff) keysToRemove.push(key)
    } else if (key.startsWith('ai_analysis:')) {
      if (key.slice('ai_analysis:'.length) < aiAnalysisCutoff) keysToRemove.push(key)
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove)
    console.log(`[EchoFocus] Cleaned up ${keysToRemove.length} old storage keys`)
  }
}

// Get storage usage info for diagnostics
export async function getStorageInfo(): Promise<{ usedBytes: number; quotaBytes: number }> {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (usedBytes) => {
      resolve({ usedBytes, quotaBytes: chrome.storage.local.QUOTA_BYTES })
    })
  })
}

// Get today's aggregate, computing it if needed.
export async function getTodayAggregate(): Promise<DailyAggregate> {
  return recomputeAndSaveAggregate(getTodayDateString())
}

// Get the cutoff date string for cleanup purposes
export function getCutoffDate(retentionDays: number): string {
  return getDateNDaysAgo(retentionDays)
}

// Export all tracking data as a JSON-serializable snapshot
export async function getAllDataForExport(): Promise<{
  entries: Record<string, TrackingEntry[]>
  aggregates: Record<string, DailyAggregate>
  settings: Settings
  customRules: ClassificationRule[]
  exportedAt: string
}> {
  const allData = await chrome.storage.local.get(null)
  const entries: Record<string, TrackingEntry[]> = {}
  const aggregates: Record<string, DailyAggregate> = {}

  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('entries:')) {
      entries[key.slice('entries:'.length)] = value as TrackingEntry[]
    } else if (key.startsWith('aggregates:')) {
      aggregates[key.slice('aggregates:'.length)] = value as DailyAggregate
    }
  }

  const settings = await getSettings()
  const customRules = await getCustomRules()

  return { entries, aggregates, settings, customRules, exportedAt: new Date().toISOString() }
}

// Delete all tracking data (entries, aggregates, AI analyses), keeping settings and auth.
// The caller (background/index.ts) also resets the live tracking session so the
// in-flight session can't materialize a fresh entry seconds after deletion.
export async function deleteAllTrackingData(): Promise<void> {
  await withStorageLock(async () => {
    const allData = await chrome.storage.local.get(null)
    const keysToRemove = Object.keys(allData).filter(key =>
      key.startsWith('entries:') ||
      key.startsWith('aggregates:') ||
      key.startsWith('ai_analysis:') ||
      // Leaving this behind would suppress tonight's summary for a day that
      // no longer exists.
      key === 'daily_summary_sent_on'
    )
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove)
      console.log(`[EchoFocus] Deleted ${keysToRemove.length} tracking data keys`)
    }
  })
}
