import { describe, it, expect } from 'vitest'
import { formatLocalDate, getTodayDateString, getDateNDaysAgo } from './aggregate'

describe('formatLocalDate', () => {
  it('formats using local calendar fields, zero-padded', () => {
    // Month/day are taken from local time, not UTC
    const d = new Date(2026, 0, 5, 23, 59, 0) // Jan 5, 2026 local
    expect(formatLocalDate(d)).toBe('2026-01-05')
  })

  it('pads single-digit months and days', () => {
    expect(formatLocalDate(new Date(2026, 8, 3))).toBe('2026-09-03')
  })
})

describe('getTodayDateString', () => {
  it('uses the LOCAL date, not UTC', () => {
    // 00:30 local on March 1 — in any timezone west of UTC, toISOString()
    // would report Feb 28/29. The local helper must say March 1.
    const localMidnightish = new Date(2026, 2, 1, 0, 30, 0)
    expect(getTodayDateString(localMidnightish)).toBe('2026-03-01')
  })

  it('uses the LOCAL date late in the evening', () => {
    // 23:30 local — in any timezone east of UTC, toISOString() would
    // report the next day.
    const lateEvening = new Date(2026, 5, 15, 23, 30, 0)
    expect(getTodayDateString(lateEvening)).toBe('2026-06-15')
  })
})

describe('getDateNDaysAgo', () => {
  it('subtracts days in local time', () => {
    const now = new Date(2026, 2, 1, 12, 0, 0) // March 1, 2026 (leap year)
    expect(getDateNDaysAgo(1, now)).toBe('2026-02-28')
    expect(getDateNDaysAgo(0, now)).toBe('2026-03-01')
    expect(getDateNDaysAgo(30, now)).toBe('2026-01-30')
  })

  it('crosses year boundaries', () => {
    const now = new Date(2026, 0, 1, 8, 0, 0)
    expect(getDateNDaysAgo(1, now)).toBe('2025-12-31')
  })
})
