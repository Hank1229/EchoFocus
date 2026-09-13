export type Category = 'productive' | 'distraction' | 'neutral' | 'uncategorized'

export interface TrackingEntry {
  id: string
  domain: string
  url: string
  title: string
  category: Category
  startTime: number  // Unix timestamp ms
  duration: number   // seconds
  date: string       // YYYY-MM-DD
}

export interface TopDomain {
  domain: string
  seconds: number
  category: Category
}

// Productive seconds per hour of the user's LOCAL day: index 0 = 00:00–00:59.
// Always 24 entries. Only productive time is bucketed — the feature it drives
// ("when do I focus best?") reads as a single-signal heat strip, and the
// per-category totals above already cover the rest of the day.
export const HOURS_PER_DAY = 24

export function emptyProductiveByHour(): number[] {
  return new Array<number>(HOURS_PER_DAY).fill(0)
}

export interface DailyAggregate {
  date: string
  totalSeconds: number
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  topDomains: TopDomain[]
  focusScore: number  // 0-100
  // Optional: aggregates written before the hourly breakdown shipped don't
  // have it, and rejecting those would erase a user's local history.
  productiveByHour?: number[]
}

export interface TrackingState {
  isTracking: boolean
  isIdle: boolean
  activeTabId: number | null
  activeDomain: string | null
  activeUrl: string | null
  activeTitle: string | null
  activeCategory: Category | null
  sessionStartTime: number | null  // Unix timestamp ms
}

export interface Settings {
  trackingEnabled: boolean
  idleTimeoutMinutes: number    // default 2
  dataRetentionDays: number     // default 30
  dailyGoalMinutes: number      // default 360 (6 hours)
}

export const DEFAULT_SETTINGS: Settings = {
  trackingEnabled: true,
  idleTimeoutMinutes: 2,
  dataRetentionDays: 30,
  dailyGoalMinutes: 360,
}

// 'weekly' covers up to 7 days and is stored under the last of those dates.
export type AiAnalysisType = 'daily' | 'weekly'

// Result from AI analysis — stored locally and in Supabase ai_analyses.
export interface AiAnalysisResult {
  analysisText: string
  focusScore: number
  analyzedAt: number  // Unix timestamp ms
  type?: AiAnalysisType  // absent means daily
}

// Anonymized daily aggregate that gets synced to Supabase.
// NEVER contains raw URLs or page titles — only domain names + durations.
export interface SyncedAggregate {
  userId: string
  date: string              // YYYY-MM-DD
  totalSeconds: number
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  focusScore: number
  topDomains: TopDomain[]   // domain name + seconds + category only
  syncedAt: string          // ISO timestamp
}
