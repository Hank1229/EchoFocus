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

function aggregateKey(date: string): string {
  return `aggregates:${date}`
}

const TRACKING_STATE_KEY = 'tracking_state'
const SETTINGS_KEY = 'settings'
const CUSTOM_RULES_KEY = 'custom_rules'
const AI_ANALYSIS_KEY_PREFIX = 'ai_analysis:'
const LAST_SEEN_AT_KEY = 'last_seen_at'

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

// ─── TrackingEntry Operations ──────────────────────────────────────────────

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
  await withStorageLock(async () => {
    const key = entriesKey(entry.date)
    const existing = await getEntriesForDate(entry.date)
    await chrome.storage.local.set({ [key]: [...existing, entry] })
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
    await chrome.storage.local.set({ [aggregateKey(date)]: aggregate })
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
export async function saveTrackingState(state: TrackingState): Promise<void> {
  await withStorageLock(async () => {
    await chrome.storage.local.set({
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
  await chrome.storage.local.set({ [LAST_SEEN_AT_KEY]: timestamp })
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
    await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...settings } })
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
  await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: rules })
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
  await chrome.storage.local.set({ [key]: result })
}

// ─── Data Retention Cleanup ────────────────────────────────────────────────

// Remove entries older than retentionDays, keep aggregates for 365 days.
export async function cleanupOldData(): Promise<void> {
  const settings = await getSettings()
  const retentionDays = settings.dataRetentionDays
  const allData = await chrome.storage.local.get(null)
  const keysToRemove: string[] = []

  const now = new Date()

  for (const key of Object.keys(allData)) {
    if (key.startsWith('entries:')) {
      const dateStr = key.slice('entries:'.length)
      const entryDate = new Date(dateStr)
      const ageInDays = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      if (ageInDays > retentionDays) {
        keysToRemove.push(key)
      }
    } else if (key.startsWith('aggregates:')) {
      const dateStr = key.slice('aggregates:'.length)
      const aggDate = new Date(dateStr)
      const ageInDays = Math.floor((now.getTime() - aggDate.getTime()) / (1000 * 60 * 60 * 24))
      if (ageInDays > 365) {
        keysToRemove.push(key)
      }
    } else if (key.startsWith('ai_analysis:')) {
      const dateStr = key.slice('ai_analysis:'.length)
      const aiDate = new Date(dateStr)
      const ageInDays = Math.floor((now.getTime() - aiDate.getTime()) / (1000 * 60 * 60 * 24))
      if (ageInDays > 90) {
        keysToRemove.push(key)
      }
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
      key.startsWith('ai_analysis:')
    )
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove)
      console.log(`[EchoFocus] Deleted ${keysToRemove.length} tracking data keys`)
    }
  })
}
