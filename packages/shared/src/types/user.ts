export interface UserProfile {
  id: string
  email: string
  displayName: string | null
  preferredLanguage: string  // 'zh-TW' | 'en' | ...
  timezone: string           // 'Asia/Taipei' | ...
  createdAt: string
}

export interface UserPreferences {
  emailReportEnabled: boolean
  emailReportTime: string    // HH:MM
  aiAnalysisEnabled: boolean
  idleTimeoutMinutes: number
  dataRetentionDays: number
  dailyGoalMinutes: number
}
