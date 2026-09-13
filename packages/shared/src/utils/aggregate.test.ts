import { describe, it, expect } from 'vitest'
import type { Category, TrackingEntry } from '../types/tracking'
import { aggregateEntries, formatLocalDate, getTodayDateString, getDateNDaysAgo } from './aggregate'

function entry(
  startTime: Date,
  duration: number,
  category: Category = 'productive',
): TrackingEntry {
  return {
    id: `e-${startTime.getTime()}`,
    domain: 'github.com',
    url: 'https://github.com/foo',
    title: 'foo',
    category,
    startTime: startTime.getTime(),
    duration,
    date: formatLocalDate(startTime),
  }
}

// Only the hours with time in them, as { hour: seconds } — a 24-slot array
// literal in every assertion would hide what each case is actually about.
function filled(buckets: number[]): Record<number, number> {
  const out: Record<number, number> = {}
  buckets.forEach((seconds, hour) => {
    if (seconds !== 0) out[hour] = seconds
  })
  return out
}

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

describe('aggregateEntries — productiveByHour', () => {
  it('returns 24 zeroed buckets for no entries', () => {
    const aggregate = aggregateEntries([], '2026-09-12')
    expect(aggregate.productiveByHour).toHaveLength(24)
    expect(filled(aggregate.productiveByHour!)).toEqual({})
  })

  it('puts an entry that fits inside one hour in that hour', () => {
    const aggregate = aggregateEntries(
      [entry(new Date(2026, 8, 12, 10, 5, 0), 600)],
      '2026-09-12',
    )
    expect(filled(aggregate.productiveByHour!)).toEqual({ 10: 600 })
  })

  it('splits an entry crossing an hour boundary proportionally', () => {
    // 09:50 + 20min → 10min in hour 9, 10min in hour 10
    const aggregate = aggregateEntries(
      [entry(new Date(2026, 8, 12, 9, 50, 0), 1200)],
      '2026-09-12',
    )
    expect(filled(aggregate.productiveByHour!)).toEqual({ 9: 600, 10: 600 })
  })

  it('spreads an entry spanning several hours across every hour it covers', () => {
    // 08:30 + 2h15m → 30min in 8, 60min in 9, 45min in 10
    const aggregate = aggregateEntries(
      [entry(new Date(2026, 8, 12, 8, 30, 0), 8100)],
      '2026-09-12',
    )
    expect(filled(aggregate.productiveByHour!)).toEqual({ 8: 1800, 9: 3600, 10: 2700 })
  })

  it('only buckets productive time', () => {
    const aggregate = aggregateEntries(
      [
        entry(new Date(2026, 8, 12, 14, 0, 0), 900),
        entry(new Date(2026, 8, 12, 15, 0, 0), 900, 'distraction'),
        entry(new Date(2026, 8, 12, 16, 0, 0), 900, 'neutral'),
        entry(new Date(2026, 8, 12, 17, 0, 0), 900, 'uncategorized'),
      ],
      '2026-09-12',
    )
    expect(filled(aggregate.productiveByHour!)).toEqual({ 14: 900 })
  })

  it('buckets sum to productiveSeconds, odd durations included', () => {
    const aggregate = aggregateEntries(
      [
        entry(new Date(2026, 8, 12, 7, 59, 47), 3607),
        entry(new Date(2026, 8, 12, 13, 12, 31), 137),
        entry(new Date(2026, 8, 12, 23, 40, 1), 999, 'distraction'),
        entry(new Date(2026, 8, 12, 21, 30, 0), 5431),
      ],
      '2026-09-12',
    )
    const sum = aggregate.productiveByHour!.reduce((a, b) => a + b, 0)
    expect(sum).toBe(aggregate.productiveSeconds)
    expect(aggregate.productiveByHour!.every(s => s >= 0)).toBe(true)
  })

  it('a day-final entry stays inside hour 23', () => {
    // Entries are already split at local midnight upstream, so the last
    // bucket of the day never bleeds into hour 0.
    const aggregate = aggregateEntries(
      [entry(new Date(2026, 8, 12, 23, 40, 0), 1200)],
      '2026-09-12',
    )
    expect(filled(aggregate.productiveByHour!)).toEqual({ 23: 1200 })
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
