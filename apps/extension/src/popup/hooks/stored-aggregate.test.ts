import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseStoredAggregate } from './stored-aggregate'

// The four corruptions from the 2026-10-13 user test (A11). Every one of them
// used to reach the popup as-is; each must now read as "no data for today".
const corrupt: [string, unknown][] = [
  ['a string instead of an object', 'not json {'],
  ['an object missing most fields', { date: 'x', totalSeconds: 120 }],
  [
    'an object with the wrong field types',
    {
      date: '2026-10-14',
      totalSeconds: 'lots',
      productiveSeconds: null,
      distractionSeconds: 0,
      neutralSeconds: 0,
      uncategorizedSeconds: 0,
      topDomains: 'github.com',
      focusScore: 'high',
      productiveByHour: [1, 2],
    },
  ],
  [
    'a well-formed aggregate whose topDomains is null',
    {
      date: '2026-10-14',
      totalSeconds: 100,
      productiveSeconds: 50,
      distractionSeconds: 50,
      neutralSeconds: 0,
      uncategorizedSeconds: 0,
      topDomains: null,
      focusScore: 50,
    },
  ],
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseStoredAggregate', () => {
  it.each(corrupt)('returns null for %s', (_label, value) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseStoredAggregate(value)).toBeNull()
  })

  it('warns once per rejected value, the way the worker does', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseStoredAggregate('not json {')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('returns null for an absent key without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseStoredAggregate(undefined)).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('passes a valid aggregate through unchanged', () => {
    const aggregate = {
      date: '2026-10-14',
      totalSeconds: 303,
      productiveSeconds: 125,
      distractionSeconds: 119,
      neutralSeconds: 59,
      uncategorizedSeconds: 0,
      topDomains: [{ domain: 'github.com', seconds: 125, category: 'productive' }],
      focusScore: 51,
    }
    expect(parseStoredAggregate(aggregate)).toEqual(aggregate)
  })
})
