import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { DailyAggregate } from '@echofocus/shared'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'

// requestAiAnalysis makes a real fetch() call — stub it so REQUEST_AI_ANALYSIS
// tests never hit the network, and so the outcome is controllable per test.
vi.mock('../lib/ai', () => ({
  requestAiAnalysis: vi.fn(async () => ({ ok: false, reason: 'unavailable' })),
}))
// SIGN_IN hands the OAuth flow to the worker; neither the identity API nor
// the network exist here.
vi.mock('../lib/auth', () => ({
  signInWithGoogle: vi.fn(async () => ({ user: { id: 'user-1' } })),
  getSession: vi.fn(async () => null),
  refreshSession: vi.fn(async () => false),
}))
vi.mock('../lib/sync', () => ({
  drainSyncQueue: vi.fn(async () => undefined),
  enqueueMissedSyncDates: vi.fn(async () => undefined),
  backfillHistoryIfNeeded: vi.fn(async () => null),
  postSignInBootstrap: vi.fn(async () => ({ backfilled: 3, failed: 0 })),
  enqueueSyncDate: vi.fn(async () => undefined),
}))

import * as ai from '../lib/ai'
import * as auth from '../lib/auth'
import * as sync from '../lib/sync'
import { handleMessage } from './index'

async function flushSignInFlow(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

let chromeStub: ChromeStub

function aggregate(overrides: Partial<DailyAggregate> = {}): DailyAggregate {
  return {
    date: '2025-01-01',
    totalSeconds: 5000,
    productiveSeconds: 4000,
    distractionSeconds: 800,
    neutralSeconds: 200,
    uncategorizedSeconds: 0,
    topDomains: [],
    focusScore: 78,
    ...overrides,
  }
}

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 14, 12, 0, 0)) // 2026-03-14 local noon
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GET_AI_ANALYSIS payload validation', () => {
  it('rejects a non-date payload with the standard error envelope', async () => {
    const response = await handleMessage({ type: 'GET_AI_ANALYSIS', payload: { not: 'a date' } })
    expect(response).toEqual({ success: false, error: 'Invalid date' })
  })

  it('accepts a well-formed date string, unchanged from before', async () => {
    const response = await handleMessage({ type: 'GET_AI_ANALYSIS', payload: '2026-03-14' })
    expect(response.success).toBe(true)
  })
})

describe('REQUEST_AI_ANALYSIS payload validation', () => {
  it('rejects a malformed date, returns the error envelope, and never writes an "aggregates:undefined" key', async () => {
    const response = await handleMessage({
      type: 'REQUEST_AI_ANALYSIS',
      payload: { date: 'not-a-date' },
    })

    expect(response.success).toBe(false)
    expect(typeof response.error).toBe('string')
    expect(Object.keys(chromeStub.store)).not.toContain('aggregates:undefined')
    expect(vi.mocked(ai.requestAiAnalysis)).not.toHaveBeenCalled()
  })

  it('rejects a payload missing the date entirely', async () => {
    const response = await handleMessage({ type: 'REQUEST_AI_ANALYSIS', payload: { language: 'en' } })
    expect(response.success).toBe(false)
    expect(Object.keys(chromeStub.store)).not.toContain('aggregates:undefined')
  })

  it('does not overwrite a preserved past-date aggregate whose entries have already been pruned', async () => {
    // Aggregates are kept 365 days; entries are pruned per dataRetentionDays.
    // A request for a date outside that window has zero entries left — if
    // REQUEST_AI_ANALYSIS recomputed it anyway, aggregateEntries([], date)
    // would zero out the very numbers being analyzed.
    const past = '2025-01-01'
    chromeStub.store[`aggregates:${past}`] = aggregate({ date: past })
    vi.mocked(ai.requestAiAnalysis).mockResolvedValue({
      ok: true,
      result: { analysisText: 'looks good', focusScore: 78, analyzedAt: Date.now() },
    })

    const response = await handleMessage({ type: 'REQUEST_AI_ANALYSIS', payload: { date: past } })

    expect(response.success).toBe(true)
    expect(chromeStub.store[`aggregates:${past}`]).toEqual(
      expect.objectContaining({ totalSeconds: 5000, productiveSeconds: 4000 }),
    )
  })

  it('still recomputes TODAY before analyzing, folding in the live session', async () => {
    const today = '2026-03-14'
    chromeStub.store[`entries:${today}`] = [{
      id: 'e1',
      domain: 'github.com',
      url: 'https://github.com',
      title: '',
      category: 'productive',
      startTime: Date.now() - 600_000,
      duration: 600,
      date: today,
    }]
    vi.mocked(ai.requestAiAnalysis).mockResolvedValue({
      ok: true,
      result: { analysisText: 'looks good', focusScore: 78, analyzedAt: Date.now() },
    })

    await handleMessage({ type: 'REQUEST_AI_ANALYSIS', payload: { date: today } })

    expect(chromeStub.store[`aggregates:${today}`]).toEqual(
      expect.objectContaining({ totalSeconds: 600 }),
    )
  })
})

describe('SIGN_IN (one-click from the popup)', () => {
  it('acknowledges immediately and completes OAuth + bootstrap in the worker', async () => {
    const res = await handleMessage({ type: 'SIGN_IN' })
    expect(res.success).toBe(true)

    await flushSignInFlow()
    expect(auth.signInWithGoogle).toHaveBeenCalled()
    expect(sync.postSignInBootstrap).toHaveBeenCalled()
    expect(chromeStub.store.signin_in_progress).toBeUndefined()
  })

  it('a cancelled OAuth clears the progress flag and skips the bootstrap', async () => {
    vi.mocked(auth.signInWithGoogle).mockResolvedValue(null)

    await handleMessage({ type: 'SIGN_IN' })
    await flushSignInFlow()

    expect(sync.postSignInBootstrap).not.toHaveBeenCalled()
    expect(chromeStub.store.signin_in_progress).toBeUndefined()
  })
})
