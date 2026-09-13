import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyAggregate } from '@echofocus/shared'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'

vi.mock('./supabase', () => ({ getSupabaseClient: vi.fn() }))
vi.mock('./auth', () => ({ getSession: vi.fn() }))

import { getSupabaseClient } from './supabase'
import { getSession } from './auth'
import {
  enqueueSyncDate,
  drainSyncQueue,
  syncYesterdayAggregate,
  syncAggregateForDate,
  getLastSyncTime,
} from './sync'

interface UpsertCall {
  table: string
  payload: Record<string, unknown>
  options: Record<string, unknown>
}

let chromeStub: ChromeStub
let upsertCalls: UpsertCall[]
/** Dates whose upsert should fail; everything else succeeds. */
let failingDates: Set<string>

function installFakeSupabase(): void {
  const client = {
    from(table: string) {
      return {
        async upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
          upsertCalls.push({ table, payload, options })
          const date = payload.date as string
          return failingDates.has(date) ? { error: { message: 'network down' } } : { error: null }
        },
      }
    },
  }
  vi.mocked(getSupabaseClient).mockReturnValue(client as unknown as SupabaseClient)
}

function signedIn(userId = 'user-1'): void {
  vi.mocked(getSession).mockResolvedValue({ user: { id: userId } } as never)
}

function aggregate(date: string, overrides: Partial<DailyAggregate> = {}): DailyAggregate {
  return {
    date,
    totalSeconds: 3600,
    productiveSeconds: 2400,
    distractionSeconds: 600,
    neutralSeconds: 400,
    uncategorizedSeconds: 200,
    topDomains: [{ domain: 'github.com', seconds: 2400, category: 'productive' }],
    focusScore: 80,
    ...overrides,
  }
}

function storeAggregate(date: string, overrides: Partial<DailyAggregate> = {}): DailyAggregate {
  const agg = aggregate(date, overrides)
  chromeStub.store[`aggregates:${date}`] = agg
  return agg
}

function pending(): string[] {
  return (chromeStub.store['pending_sync_dates'] as string[] | undefined) ?? []
}

beforeEach(() => {
  chromeStub = installChromeStub()
  upsertCalls = []
  failingDates = new Set()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 15, 0, 5, 0))
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  installFakeSupabase()
  signedIn()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the pending sync queue', () => {
  it('stores queued dates under "pending_sync_dates"', async () => {
    await enqueueSyncDate('2026-03-14')
    expect(pending()).toEqual(['2026-03-14'])
  })

  it('does not queue the same date twice', async () => {
    await enqueueSyncDate('2026-03-14')
    await enqueueSyncDate('2026-03-14')
    expect(pending()).toEqual(['2026-03-14'])
  })

  it('caps the queue at 60 dates, keeping the most recent', async () => {
    const dates = Array.from({ length: 70 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)
    chromeStub.store['pending_sync_dates'] = dates
    await enqueueSyncDate('2026-02-01')

    const queued = pending()
    expect(queued).toHaveLength(60)
    expect(queued[queued.length - 1]).toBe('2026-02-01')
    expect(queued).not.toContain('2026-01-01')
  })

  it('ignores non-string junk in the stored queue', async () => {
    chromeStub.store['pending_sync_dates'] = ['2026-03-14', 42, null]
    await enqueueSyncDate('2026-03-15')
    expect(pending()).toEqual(['2026-03-14', '2026-03-15'])
  })
})

describe('drainSyncQueue', () => {
  it('does nothing (and never checks auth) when the queue is empty', async () => {
    await drainSyncQueue()
    expect(getSession).not.toHaveBeenCalled()
    expect(upsertCalls).toEqual([])
  })

  it('keeps dates queued when the user is not signed in', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    await enqueueSyncDate('2026-03-14')
    storeAggregate('2026-03-14')

    await drainSyncQueue()

    expect(upsertCalls).toEqual([])
    expect(pending()).toEqual(['2026-03-14'])
    expect(chromeStub.store['last_sync_at']).toBeUndefined()
  })

  it('removes a date only after a confirmed upsert and stamps last_sync_at', async () => {
    storeAggregate('2026-03-14')
    await enqueueSyncDate('2026-03-14')

    await drainSyncQueue()

    expect(upsertCalls).toHaveLength(1)
    expect(pending()).toEqual([])
    expect(chromeStub.store['last_sync_at']).toBe(new Date().toISOString())
  })

  it('leaves a failed date queued for the next drain', async () => {
    storeAggregate('2026-03-14')
    failingDates.add('2026-03-14')
    await enqueueSyncDate('2026-03-14')

    await drainSyncQueue()

    expect(pending()).toEqual(['2026-03-14'])
    expect(chromeStub.store['last_sync_at']).toBeUndefined()
  })

  it('retries a previously failed date on the next drain', async () => {
    storeAggregate('2026-03-14')
    failingDates.add('2026-03-14')
    await enqueueSyncDate('2026-03-14')
    await drainSyncQueue()

    failingDates.clear()
    await drainSyncQueue()

    expect(upsertCalls).toHaveLength(2)
    expect(pending()).toEqual([])
  })

  it('drops a queued date that has no local aggregate so the queue cannot clog', async () => {
    await enqueueSyncDate('2026-03-14')

    await drainSyncQueue()

    expect(upsertCalls).toEqual([])
    expect(pending()).toEqual([])
    expect(chromeStub.store['last_sync_at']).toBeUndefined()
  })

  it('syncs the successful days even when one day fails', async () => {
    storeAggregate('2026-03-13')
    storeAggregate('2026-03-14')
    failingDates.add('2026-03-13')
    await enqueueSyncDate('2026-03-13')
    await enqueueSyncDate('2026-03-14')

    await drainSyncQueue()

    expect(pending()).toEqual(['2026-03-13'])
    expect(chromeStub.store['last_sync_at']).toBe(new Date().toISOString())
  })
})

describe('the upserted row', () => {
  it('maps the aggregate onto the synced_aggregates columns', async () => {
    const agg = storeAggregate('2026-03-14')
    await enqueueSyncDate('2026-03-14')

    await drainSyncQueue()

    expect(upsertCalls[0].table).toBe('synced_aggregates')
    expect(upsertCalls[0].options).toEqual({ onConflict: 'user_id,date' })
    expect(upsertCalls[0].payload).toEqual({
      user_id: 'user-1',
      date: '2026-03-14',
      total_seconds: agg.totalSeconds,
      productive_seconds: agg.productiveSeconds,
      distraction_seconds: agg.distractionSeconds,
      neutral_seconds: agg.neutralSeconds,
      uncategorized_seconds: agg.uncategorizedSeconds,
      focus_score: agg.focusScore,
      top_domains: agg.topDomains,
      synced_at: new Date().toISOString(),
    })
  })

  it('sends no URLs or page titles', async () => {
    storeAggregate('2026-03-14')
    await enqueueSyncDate('2026-03-14')

    await drainSyncQueue()

    const serialized = JSON.stringify(upsertCalls[0].payload)
    expect(serialized).not.toContain('http')
    expect(serialized).not.toContain('title')
    expect(serialized).not.toContain('url')
  })
})

describe('syncYesterdayAggregate', () => {
  it('syncs YESTERDAY\'s local date, not today and not a UTC date', async () => {
    // 00:05 local on March 15 — a UTC-based date would be March 14 or 15
    // depending on the timezone; the local answer is always March 14.
    storeAggregate('2026-03-14')

    await syncYesterdayAggregate()

    expect(upsertCalls.map((c) => c.payload.date)).toEqual(['2026-03-14'])
    expect(pending()).toEqual([])
  })

  it('drains previously failed days alongside yesterday', async () => {
    storeAggregate('2026-03-10')
    storeAggregate('2026-03-14')
    chromeStub.store['pending_sync_dates'] = ['2026-03-10']

    await syncYesterdayAggregate()

    expect(upsertCalls.map((c) => c.payload.date).sort()).toEqual(['2026-03-10', '2026-03-14'])
  })

  it('crosses a month boundary in local time', async () => {
    vi.setSystemTime(new Date(2026, 2, 1, 0, 5, 0)) // 2026-03-01
    storeAggregate('2026-02-28')

    await syncYesterdayAggregate()

    expect(upsertCalls.map((c) => c.payload.date)).toEqual(['2026-02-28'])
  })
})

describe('syncAggregateForDate (the manual "Sync now" button)', () => {
  it('refuses when not signed in', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    expect(await syncAggregateForDate('2026-03-14')).toEqual({
      ok: false,
      message: 'Please sign in first',
    })
    expect(upsertCalls).toEqual([])
  })

  it('reports when there is no local data for the date', async () => {
    const result = await syncAggregateForDate('2026-03-14')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('2026-03-14')
    expect(upsertCalls).toEqual([])
  })

  it('stamps last_sync_at and clears the date from the retry queue on success', async () => {
    storeAggregate('2026-03-14')
    chromeStub.store['pending_sync_dates'] = ['2026-03-14']

    const result = await syncAggregateForDate('2026-03-14')

    expect(result.ok).toBe(true)
    expect(chromeStub.store['last_sync_at']).toBe(new Date().toISOString())
    expect(pending()).toEqual([])
  })

  it('queues the date for the nightly retry when the upsert fails', async () => {
    storeAggregate('2026-03-14')
    failingDates.add('2026-03-14')

    const result = await syncAggregateForDate('2026-03-14')

    expect(result.ok).toBe(false)
    expect(pending()).toEqual(['2026-03-14'])
    expect(chromeStub.store['last_sync_at']).toBeUndefined()
  })
})

describe('getLastSyncTime', () => {
  it('returns null when nothing has synced yet', async () => {
    expect(await getLastSyncTime()).toBeNull()
  })

  it('returns the stored ISO timestamp', async () => {
    chromeStub.store['last_sync_at'] = '2026-03-15T00:05:00.000Z'
    expect(await getLastSyncTime()).toBe('2026-03-15T00:05:00.000Z')
  })
})
