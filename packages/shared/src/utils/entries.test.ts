import { describe, it, expect } from 'vitest'
import { splitEntryAtMidnight } from './entries'
import { formatLocalDate } from './aggregate'
import type { TrackingEntry } from '../types/tracking'

function makeEntry(startTime: number, durationSeconds: number): TrackingEntry {
  return {
    id: 'test-id',
    domain: 'github.com',
    url: 'https://github.com/user/repo',
    title: 'Repo',
    category: 'productive',
    startTime,
    duration: durationSeconds,
    date: formatLocalDate(new Date(startTime)),
  }
}

// Local timestamp helper
function local(y: number, m: number, d: number, h: number, min: number, s = 0): number {
  return new Date(y, m - 1, d, h, min, s).getTime()
}

describe('splitEntryAtMidnight', () => {
  it('returns a single entry when it stays within one local day', () => {
    const start = local(2026, 3, 10, 14, 0)
    const parts = splitEntryAtMidnight(makeEntry(start, 600))
    expect(parts).toHaveLength(1)
    expect(parts[0].date).toBe('2026-03-10')
    expect(parts[0].duration).toBe(600)
    expect(parts[0].id).toBe('test-id')
  })

  it('splits an entry that crosses local midnight into two dated parts', () => {
    // 23:50 → 00:10 next day (20 minutes total)
    const start = local(2026, 3, 10, 23, 50)
    const parts = splitEntryAtMidnight(makeEntry(start, 20 * 60))

    expect(parts).toHaveLength(2)
    expect(parts[0].date).toBe('2026-03-10')
    expect(parts[0].duration).toBe(10 * 60)
    expect(parts[0].startTime).toBe(start)
    expect(parts[0].id).toBe('test-id')

    expect(parts[1].date).toBe('2026-03-11')
    expect(parts[1].duration).toBe(10 * 60)
    expect(parts[1].startTime).toBe(local(2026, 3, 11, 0, 0))
    expect(parts[1].id).toBe('test-id-2')
  })

  it('preserves total duration across the split', () => {
    const start = local(2026, 3, 10, 23, 59, 37)
    const total = 300
    const parts = splitEntryAtMidnight(makeEntry(start, total))
    const sum = parts.reduce((acc, p) => acc + p.duration, 0)
    expect(sum).toBe(total)
  })

  it('preserves total duration when midnight falls on a half second', () => {
    // 23:59:59.500 → 00:00:01.500: both halves round up individually, which
    // would inflate the total by 1s without the remainder-based last part.
    const start = local(2026, 3, 10, 23, 59, 59) + 500
    const parts = splitEntryAtMidnight(makeEntry(start, 2))

    expect(parts).toHaveLength(2)
    expect(parts[0].date).toBe('2026-03-10')
    expect(parts[1].date).toBe('2026-03-11')
    expect(parts.reduce((acc, p) => acc + p.duration, 0)).toBe(2)
  })

  it('handles an entry spanning more than one midnight', () => {
    // 23:00 → 01:00 two days later (26 hours)
    const start = local(2026, 3, 10, 23, 0)
    const parts = splitEntryAtMidnight(makeEntry(start, 26 * 3600))
    expect(parts.map((p) => p.date)).toEqual(['2026-03-10', '2026-03-11', '2026-03-12'])
    expect(parts.map((p) => p.duration)).toEqual([3600, 24 * 3600, 3600])
    expect(parts.map((p) => p.id)).toEqual(['test-id', 'test-id-2', 'test-id-3'])
  })

  it('corrects the date of an entry stamped with the wrong day', () => {
    // Entry saved with an end-date stamp — split must restamp from startTime
    const start = local(2026, 3, 10, 22, 0)
    const entry = { ...makeEntry(start, 60), date: '2026-03-11' }
    const parts = splitEntryAtMidnight(entry)
    expect(parts).toHaveLength(1)
    expect(parts[0].date).toBe('2026-03-10')
  })

  it('returns a single zero-duration entry unchanged except for the date', () => {
    const start = local(2026, 3, 10, 12, 0)
    const parts = splitEntryAtMidnight(makeEntry(start, 0))
    expect(parts).toHaveLength(1)
    expect(parts[0].duration).toBe(0)
    expect(parts[0].date).toBe('2026-03-10')
  })
})
