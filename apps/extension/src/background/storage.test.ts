import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { TrackingEntry, DailyAggregate, TrackingState } from '@echofocus/shared'
import { DEFAULT_SETTINGS, aggregateEntries } from '@echofocus/shared'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'
import {
  withStorageLock,
  getEntriesForDate,
  saveEntry,
  getAggregateForDate,
  recomputeAndSaveAggregate,
  getTrackingState,
  saveTrackingState,
  getLastSeenAt,
  saveLastSeenAt,
  getSettings,
  saveSettings,
  getCustomRules,
  saveCustomRules,
  getAiAnalysis,
  saveAiAnalysis,
  cleanupOldData,
  getStorageInfo,
  getTodayAggregate,
  getCutoffDate,
  getAllDataForExport,
  deleteAllTrackingData,
} from './storage'

let chromeStub: ChromeStub

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function entry(overrides: Partial<TrackingEntry> = {}): TrackingEntry {
  return {
    id: 'e1',
    domain: 'github.com',
    url: 'https://github.com/a/b',
    title: 'repo',
    category: 'productive',
    startTime: 1_700_000_000_000,
    duration: 120,
    date: '2026-03-14',
    ...overrides,
  }
}

describe('entry storage keys', () => {
  it('writes entries under "entries:<date>" using the ENTRY date, not today', async () => {
    await saveEntry(entry({ date: '2025-12-31' }))
    expect(Object.keys(chromeStub.store)).toEqual(['entries:2025-12-31'])
  })

  it('appends to the existing day instead of overwriting it', async () => {
    await saveEntry(entry({ id: 'a' }))
    await saveEntry(entry({ id: 'b' }))
    const stored = await getEntriesForDate('2026-03-14')
    expect(stored.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('keeps different dates in separate keys', async () => {
    await saveEntry(entry({ id: 'a', date: '2026-03-14' }))
    await saveEntry(entry({ id: 'b', date: '2026-03-15' }))
    expect(await getEntriesForDate('2026-03-14')).toHaveLength(1)
    expect(await getEntriesForDate('2026-03-15')).toHaveLength(1)
  })
})

describe('getEntriesForDate', () => {
  it('returns an empty array when the key is absent', async () => {
    expect(await getEntriesForDate('2026-03-14')).toEqual([])
  })

  it('ignores a corrupt value rather than returning garbage', async () => {
    chromeStub.store['entries:2026-03-14'] = [{ id: 'x', duration: 'not-a-number' }]
    expect(await getEntriesForDate('2026-03-14')).toEqual([])
  })

  it('ignores a non-array value', async () => {
    chromeStub.store['entries:2026-03-14'] = { nope: true }
    expect(await getEntriesForDate('2026-03-14')).toEqual([])
  })
})

describe('withStorageLock', () => {
  it('serializes concurrent read-modify-write pairs so no write is lost', async () => {
    // Two saveEntry calls started in the same tick: without the mutex both
    // read the same empty array and the first entry disappears.
    await Promise.all([saveEntry(entry({ id: 'a' })), saveEntry(entry({ id: 'b' }))])
    const stored = await getEntriesForDate('2026-03-14')
    expect(stored.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps the queue alive after a rejected operation', async () => {
    await expect(withStorageLock(async () => {
      throw new Error('boom')
    })).rejects.toThrow('boom')
    await expect(withStorageLock(async () => 'still works')).resolves.toBe('still works')
  })
})

describe('recomputeAndSaveAggregate', () => {
  it('writes under "aggregates:<date>" and delegates to shared aggregateEntries', async () => {
    const entries = [
      entry({ id: 'a', domain: 'github.com', category: 'productive', duration: 600 }),
      entry({ id: 'b', domain: 'youtube.com', category: 'distraction', duration: 300 }),
      entry({ id: 'c', domain: 'wikipedia.org', category: 'neutral', duration: 60 }),
    ]
    for (const e of entries) await saveEntry(e)

    const aggregate = await recomputeAndSaveAggregate('2026-03-14')

    // Byte-for-byte identical to the shared implementation — the extension
    // must never re-implement aggregation.
    expect(aggregate).toEqual(aggregateEntries(entries, '2026-03-14'))
    expect(chromeStub.store['aggregates:2026-03-14']).toEqual(aggregate)
    expect(aggregate.totalSeconds).toBe(960)
    expect(aggregate.focusScore).toBe(67)
  })

  it('produces a zeroed aggregate for a day with no entries', async () => {
    const aggregate = await recomputeAndSaveAggregate('2026-03-14')
    expect(aggregate).toEqual(aggregateEntries([], '2026-03-14'))
    expect(aggregate.totalSeconds).toBe(0)
    expect(aggregate.topDomains).toEqual([])
  })

  it('overwrites a stale aggregate on recompute', async () => {
    chromeStub.store['aggregates:2026-03-14'] = { date: '2026-03-14', totalSeconds: 99999 }
    await saveEntry(entry({ duration: 30 }))
    const aggregate = await recomputeAndSaveAggregate('2026-03-14')
    expect(aggregate.totalSeconds).toBe(30)
  })
})

describe('getAggregateForDate', () => {
  it('returns null when absent', async () => {
    expect(await getAggregateForDate('2026-03-14')).toBeNull()
  })

  it('returns null for a corrupt aggregate instead of a partial object', async () => {
    chromeStub.store['aggregates:2026-03-14'] = { date: 'not-a-date', totalSeconds: 1 }
    expect(await getAggregateForDate('2026-03-14')).toBeNull()
  })

  it('round-trips a valid aggregate', async () => {
    const aggregate: DailyAggregate = {
      date: '2026-03-14',
      totalSeconds: 100,
      productiveSeconds: 60,
      distractionSeconds: 40,
      neutralSeconds: 0,
      uncategorizedSeconds: 0,
      topDomains: [{ domain: 'github.com', seconds: 60, category: 'productive' }],
      focusScore: 60,
    }
    chromeStub.store['aggregates:2026-03-14'] = aggregate
    expect(await getAggregateForDate('2026-03-14')).toEqual(aggregate)
  })
})

describe('tracking state', () => {
  const state: TrackingState = {
    isTracking: true,
    isIdle: false,
    activeTabId: 7,
    activeDomain: 'github.com',
    activeUrl: 'https://github.com/',
    activeTitle: 'GitHub',
    activeCategory: 'productive',
    sessionStartTime: 1_700_000_000_000,
  }

  it('uses the "tracking_state" key', async () => {
    await saveTrackingState(state)
    expect(chromeStub.store['tracking_state']).toEqual(state)
  })

  it('refreshes last_seen_at in the SAME write as the state', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0))
    await saveTrackingState(state)
    expect(chromeStub.store['last_seen_at']).toBe(Date.now())
  })

  it('returns defaults when nothing is stored', async () => {
    expect(await getTrackingState()).toEqual({
      isTracking: true,
      isIdle: false,
      activeTabId: null,
      activeDomain: null,
      activeUrl: null,
      activeTitle: null,
      activeCategory: null,
      sessionStartTime: null,
    })
  })

  it('falls back to defaults for a corrupt stored state', async () => {
    chromeStub.store['tracking_state'] = { isTracking: 'yes' }
    const restored = await getTrackingState()
    expect(restored.isTracking).toBe(true)
    expect(restored.sessionStartTime).toBeNull()
  })

  it('round-trips a stored state', async () => {
    await saveTrackingState(state)
    expect(await getTrackingState()).toEqual(state)
  })
})

describe('last seen heartbeat', () => {
  it('returns null when absent', async () => {
    expect(await getLastSeenAt()).toBeNull()
  })

  it('returns null for a non-numeric stored value', async () => {
    chromeStub.store['last_seen_at'] = '2026-03-14T10:00:00Z'
    expect(await getLastSeenAt()).toBeNull()
  })

  it('round-trips a timestamp', async () => {
    await saveLastSeenAt(1_700_000_000_000)
    expect(await getLastSeenAt()).toBe(1_700_000_000_000)
  })
})

describe('settings', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('merges a partial stored object over the defaults (older versions saved fewer fields)', async () => {
    chromeStub.store['settings'] = { dailyGoalMinutes: 120 }
    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, dailyGoalMinutes: 120 })
  })

  it('falls back to all defaults when a stored field is invalid', async () => {
    chromeStub.store['settings'] = { idleTimeoutMinutes: -5, dailyGoalMinutes: 120 }
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('saveSettings merges into the current settings instead of replacing them', async () => {
    await saveSettings({ dailyGoalMinutes: 240 })
    await saveSettings({ trackingEnabled: false })
    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      dailyGoalMinutes: 240,
      trackingEnabled: false,
    })
  })
})

describe('custom rules', () => {
  const rule = {
    id: 'r1',
    pattern: 'example.com',
    matchType: 'exact' as const,
    category: 'productive' as const,
    isDefault: false,
    createdAt: 1_700_000_000_000,
  }

  it('returns an empty array when absent', async () => {
    expect(await getCustomRules()).toEqual([])
  })

  it('round-trips saved rules under "custom_rules"', async () => {
    await saveCustomRules([rule])
    expect(chromeStub.store['custom_rules']).toEqual([rule])
    expect(await getCustomRules()).toEqual([rule])
  })

  it('salvages the valid rules and drops only the invalid ones', async () => {
    chromeStub.store['custom_rules'] = [rule, { id: 'bad' }, { ...rule, id: 'r2', pattern: '' }]
    expect(await getCustomRules()).toEqual([rule])
  })

  it('returns an empty array for a non-array value', async () => {
    chromeStub.store['custom_rules'] = 'oops'
    expect(await getCustomRules()).toEqual([])
  })
})

describe('AI analysis storage', () => {
  const analysis = { analysisText: 'Nice focus today.', focusScore: 72, analyzedAt: 1_700_000_000_000 }

  it('uses the "ai_analysis:<date>" key', async () => {
    await saveAiAnalysis('2026-03-14', analysis)
    expect(chromeStub.store['ai_analysis:2026-03-14']).toEqual(analysis)
    expect(await getAiAnalysis('2026-03-14')).toEqual(analysis)
  })

  it('returns null when absent or corrupt', async () => {
    expect(await getAiAnalysis('2026-03-14')).toBeNull()
    chromeStub.store['ai_analysis:2026-03-14'] = { analysisText: 'x' }
    expect(await getAiAnalysis('2026-03-14')).toBeNull()
  })
})

describe('cleanupOldData', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0)) // 2026-06-15 local noon
  })

  it('removes entry days older than dataRetentionDays and keeps recent ones', async () => {
    chromeStub.store['entries:2026-06-10'] = [] // 5 days old
    chromeStub.store['entries:2026-05-01'] = [] // ~45 days old
    await cleanupOldData()
    expect(Object.keys(chromeStub.store)).toContain('entries:2026-06-10')
    expect(Object.keys(chromeStub.store)).not.toContain('entries:2026-05-01')
  })

  it('honours a longer dataRetentionDays from settings', async () => {
    chromeStub.store['settings'] = { ...DEFAULT_SETTINGS, dataRetentionDays: 90 }
    chromeStub.store['entries:2026-05-01'] = [] // ~45 days old — inside 90
    await cleanupOldData()
    expect(Object.keys(chromeStub.store)).toContain('entries:2026-05-01')
  })

  it('keeps aggregates for a year and drops older ones', async () => {
    chromeStub.store['aggregates:2026-01-01'] = {} // ~165 days
    chromeStub.store['aggregates:2024-01-01'] = {} // ~2 years
    await cleanupOldData()
    expect(Object.keys(chromeStub.store)).toContain('aggregates:2026-01-01')
    expect(Object.keys(chromeStub.store)).not.toContain('aggregates:2024-01-01')
  })

  it('keeps AI analyses for 90 days and drops older ones', async () => {
    chromeStub.store['ai_analysis:2026-06-01'] = {} // 14 days
    chromeStub.store['ai_analysis:2026-01-01'] = {} // ~165 days
    await cleanupOldData()
    expect(Object.keys(chromeStub.store)).toContain('ai_analysis:2026-06-01')
    expect(Object.keys(chromeStub.store)).not.toContain('ai_analysis:2026-01-01')
  })

  it('never touches settings, tracking state, or the auth session', async () => {
    chromeStub.store['settings'] = { ...DEFAULT_SETTINGS }
    chromeStub.store['tracking_state'] = { isTracking: true }
    chromeStub.store['supabase_session'] = 'token'
    chromeStub.store['entries:2020-01-01'] = []
    await cleanupOldData()
    expect(Object.keys(chromeStub.store).sort()).toEqual([
      'settings',
      'supabase_session',
      'tracking_state',
    ])
  })

  it('issues no remove() call when nothing is expired', async () => {
    chromeStub.store['entries:2026-06-14'] = []
    await cleanupOldData()
    expect(chromeStub.removedKeys).toEqual([])
  })
})

describe('getStorageInfo', () => {
  it('reports bytes in use and the quota', async () => {
    await saveEntry(entry())
    const info = await getStorageInfo()
    expect(info.usedBytes).toBeGreaterThan(0)
    expect(info.quotaBytes).toBe(10485760)
  })
})

describe('getTodayAggregate', () => {
  it('computes and stores the aggregate under TODAY\'s local date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 23:30 local — a UTC-based key would land on the wrong day east of UTC
    vi.setSystemTime(new Date(2026, 2, 14, 23, 30, 0))
    await saveEntry(entry({ date: '2026-03-14', duration: 45 }))
    const aggregate = await getTodayAggregate()
    expect(aggregate.date).toBe('2026-03-14')
    expect(aggregate.totalSeconds).toBe(45)
    expect(chromeStub.store['aggregates:2026-03-14']).toBeDefined()
  })
})

describe('getCutoffDate', () => {
  it('returns the local date N days ago', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 2, 1, 0, 30, 0))
    expect(getCutoffDate(1)).toBe('2026-02-28')
  })
})

describe('getAllDataForExport', () => {
  it('groups entries and aggregates by date with the prefix stripped', async () => {
    await saveEntry(entry({ date: '2026-03-14' }))
    await recomputeAndSaveAggregate('2026-03-14')
    chromeStub.store['supabase_session'] = 'secret'

    const exported = await getAllDataForExport()

    expect(Object.keys(exported.entries)).toEqual(['2026-03-14'])
    expect(Object.keys(exported.aggregates)).toEqual(['2026-03-14'])
    expect(exported.settings).toEqual(DEFAULT_SETTINGS)
    expect(exported.customRules).toEqual([])
    expect(typeof exported.exportedAt).toBe('string')
    // The auth session is not part of a data export
    expect(JSON.stringify(exported)).not.toContain('secret')
  })
})

describe('deleteAllTrackingData', () => {
  it('removes only entries, aggregates, and AI analyses', async () => {
    chromeStub.store['entries:2026-03-14'] = []
    chromeStub.store['aggregates:2026-03-14'] = {}
    chromeStub.store['ai_analysis:2026-03-14'] = {}
    chromeStub.store['settings'] = { ...DEFAULT_SETTINGS }
    chromeStub.store['tracking_state'] = { isTracking: true }
    chromeStub.store['supabase_session'] = 'token'
    chromeStub.store['custom_rules'] = []

    await deleteAllTrackingData()

    expect(Object.keys(chromeStub.store).sort()).toEqual([
      'custom_rules',
      'settings',
      'supabase_session',
      'tracking_state',
    ])
  })
})
