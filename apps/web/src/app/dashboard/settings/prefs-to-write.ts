export interface UserPreference {
  email_report_enabled: boolean
  idle_timeout_minutes: number
  data_retention_days: number
  daily_goal_minutes: number
  pomodoro_focus_minutes: number
  pomodoro_break_minutes: number
  pomodoro_reminders_enabled: boolean
}

// Shown while an account has no row yet, and written whole on its first
// Save. Mirrors the column defaults in the migrations: email reports are off
// (007), everything else as 001 and 008 set them.
export const DEFAULT_PREFS: UserPreference = {
  email_report_enabled: false,
  idle_timeout_minutes: 2,
  data_retention_days: 30,
  daily_goal_minutes: 360,
  pomodoro_focus_minutes: 25,
  pomodoro_break_minutes: 5,
  pomodoro_reminders_enabled: true,
}

// What Save writes. Against the row this page loaded (or last saved), only
// the fields changed here: a page left open must not write its stale values
// over ones saved elsewhere since, such as durations from the popup's
// steppers. With no row yet there is nothing to protect, so everything goes,
// as before.
export function prefsToWrite(saved: UserPreference | null, current: UserPreference): Partial<UserPreference> {
  if (!saved) return current
  return Object.fromEntries(
    (Object.keys(current) as (keyof UserPreference)[])
      .filter(key => current[key] !== saved[key])
      .map(key => [key, current[key]]),
  )
}
