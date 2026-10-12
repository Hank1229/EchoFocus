import { describe, it, expect } from 'vitest'
import { prefsToWrite, type UserPreference } from './prefs-to-write'

const loaded: UserPreference = {
  email_report_enabled: false,
  idle_timeout_minutes: 2,
  data_retention_days: 30,
  daily_goal_minutes: 360,
  pomodoro_focus_minutes: 25,
  pomodoro_break_minutes: 5,
  pomodoro_reminders_enabled: true,
}

describe('prefsToWrite', () => {
  it('writes only the fields changed since the page loaded', () => {
    expect(prefsToWrite(loaded, { ...loaded, daily_goal_minutes: 420 })).toEqual({ daily_goal_minutes: 420 })
  })

  it('leaves the durations alone when only another field changed', () => {
    const changes = prefsToWrite(loaded, { ...loaded, pomodoro_reminders_enabled: false })
    expect(changes).toEqual({ pomodoro_reminders_enabled: false })
    expect(changes).not.toHaveProperty('pomodoro_focus_minutes')
    expect(changes).not.toHaveProperty('pomodoro_break_minutes')
  })

  it('writes nothing when nothing changed', () => {
    expect(prefsToWrite(loaded, { ...loaded })).toEqual({})
  })

  it('writes every field when the account has no row yet, as before', () => {
    expect(prefsToWrite(null, loaded)).toEqual(loaded)
  })
})
