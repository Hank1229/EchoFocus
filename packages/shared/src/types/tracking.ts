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

export interface DailyAggregate {
  date: string
  totalSeconds: number
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  topDomains: TopDomain[]
  focusScore: number  // 0-100
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

// Result from AI analysis — stored locally and in Supabase ai_analyses.
export interface AiAnalysisResult {
  analysisText: string
  focusScore: number
  analyzedAt: number  // Unix timestamp ms
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
