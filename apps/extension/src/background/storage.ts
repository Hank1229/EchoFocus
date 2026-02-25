import type { TrackingEntry, DailyAggregate, TrackingState, Settings, AiAnalysisResult } from '@echofocus/shared'
import type { ClassificationRule } from '@echofocus/shared'
import { DEFAULT_SETTINGS, aggregateEntries, getTodayDateString, getDateNDaysAgo } from '@echofocus/shared'

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

// ─── TrackingEntry Operations ──────────────────────────────────────────────

export async function getEntriesForDate(date: string): Promise<TrackingEntry[]> {
  const key = entriesKey(date)
  const result = await chrome.storage.local.get(key)
  return (result[key] as TrackingEntry[] | undefined) ?? []
}

export async function saveEntry(entry: TrackingEntry): Promise<void> {
  const key = entriesKey(entry.date)
  const existing = await getEntriesForDate(entry.date)
  await chrome.storage.local.set({ [key]: [...existing, entry] })
}

// ─── DailyAggregate Operations ────────────────────────────────────────────

export async function getAggregateForDate(date: string): Promise<DailyAggregate | null> {
  const key = aggregateKey(date)
  const result = await chrome.storage.local.get(key)
  return (result[key] as DailyAggregate | undefined) ?? null
}

export async function recomputeAndSaveAggregate(date: string): Promise<DailyAggregate> {
  const entries = await getEntriesForDate(date)
  const aggregate = aggregateEntries(entries, date)
  await chrome.storage.local.set({ [aggregateKey(date)]: aggregate })
  return aggregate
}

// ─── TrackingState Operations ──────────────────────────────────────────────

export async function getTrackingState(): Promise<TrackingState> {
  const result = await chrome.storage.local.get(TRACKING_STATE_KEY)
  const saved = result[TRACKING_STATE_KEY] as TrackingState | undefined
  if (saved) return saved

  return {
    isTracking: true,
    isIdle: false,
    activeTabId: null,
    activeDomain: null,
    activeUrl: null,
    activeTitle: null,
    activeCategory: null,
    sessionStartTime: null,
  }
}

export async function saveTrackingState(state: TrackingState): Promise<void> {
  await chrome.storage.local.set({ [TRACKING_STATE_KEY]: state })
}

// ─── Settings Operations ───────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY)
  const saved = result[SETTINGS_KEY] as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...saved }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...settings } })
}

// ─── Custom Rules Operations ───────────────────────────────────────────────

export async function getCustomRules(): Promise<ClassificationRule[]> {
  const result = await chrome.storage.local.get(CUSTOM_RULES_KEY)
  return (result[CUSTOM_RULES_KEY] as ClassificationRule[] | undefined) ?? []
}

export async function saveCustomRules(rules: ClassificationRule[]): Promise<void> {
  await chrome.storage.local.set({ [CUSTOM_RULES_KEY]: rules })
}

// ─── AI Analysis Operations ───────────────────────────────────────────────

export async function getAiAnalysis(date: string): Promise<AiAnalysisResult | null> {
  const key = `${AI_ANALYSIS_KEY_PREFIX}${date}`
  const result = await chrome.storage.local.get(key)
  return (result[key] as AiAnalysisResult | undefined) ?? null
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
      resolve({ usedBytes, quotaBytes: 10 * 1024 * 1024 }) // 10MB quota
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

// Delete all tracking data (entries, aggregates, AI analyses), keeping settings and auth
export async function deleteAllTrackingData(): Promise<void> {
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
}
