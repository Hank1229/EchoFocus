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
  signInWithGoogle: vi.fn(async () => ({ session: { user: { id: 'user-1' } } })),
  signOutLocally: vi.fn(async () => undefined),
  getSession: vi.fn(async () => null),
  refreshSession: vi.fn(async () => false),
  verifySessionAlive: vi.fn(async () => undefined),
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
import { handleMessage, dashboardEvent } from './index'

// Macrotask turns drain every microtask the worker-side flow chains (storage
// writes, tab queries) — a fixed microtask count went stale as the flow grew,
// and an unfinished flow leaks its in-flight guard into the next test.
async function flushSignInFlow(): Promise<void> {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => setTimeout(resolve, 0))
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
  // clearAllMocks keeps a test's mockResolvedValue() override; re-seed the
  // sign-in defaults so a cancelled-OAuth test can't leak into the next one.
  vi.mocked(auth.signInWithGoogle).mockResolvedValue({ session: { user: { id: 'user-1' } } } as never)
  vi.mocked(auth.getSession).mockResolvedValue(null)
  vi.mocked(sync.postSignInBootstrap).mockResolvedValue({ backfilled: 3, failed: 0 })
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

const DASHBOARD = 'https://echo-focus-web.vercel.app'
const AUTO_LOGIN = `${DASHBOARD}/login?auto=1`
const fromDashboard = { origin: DASHBOARD } as chrome.runtime.MessageSender

describe('SIGN_IN (one-click from the popup)', () => {
  it('acknowledges immediately and completes OAuth + bootstrap in the worker', async () => {
    const res = await handleMessage({ type: 'SIGN_IN' })
    expect(res.success).toBe(true)

    await flushSignInFlow()
    expect(auth.signInWithGoogle).toHaveBeenCalledWith({ silent: false })
    expect(sync.postSignInBootstrap).toHaveBeenCalled()
    expect(chromeStub.store.signin_in_progress).toBeUndefined()
  })

  it('a cancelled OAuth clears the progress flag and skips the bootstrap', async () => {
    vi.mocked(auth.signInWithGoogle).mockResolvedValue({ failure: 'cancelled' })

    await handleMessage({ type: 'SIGN_IN' })
    await flushSignInFlow()

    expect(sync.postSignInBootstrap).not.toHaveBeenCalled()
    expect(chromeStub.store.signin_in_progress).toBeUndefined()
    expect(chromeStub.createdTabUrls).toEqual([])
  })

  it('opens the dashboard signed in once the bootstrap is done', async () => {
    await handleMessage({ type: 'SIGN_IN' })
    await flushSignInFlow()

    expect(chromeStub.createdTabUrls).toEqual([AUTO_LOGIN])
  })

  it('reuses an existing dashboard tab: focuses it and reloads through auto-login', async () => {
    chromeStub.tabs = [
      { id: 1, windowId: 7, active: true, url: 'https://github.com/' },
      { id: 2, windowId: 7, active: false, url: `${DASHBOARD}/dashboard/trends` },
    ]

    await handleMessage({ type: 'SIGN_IN' })
    await flushSignInFlow()

    expect(chromeStub.createdTabUrls).toEqual([])
    expect(chromeStub.updatedTabs).toEqual([{ id: 2, info: { url: AUTO_LOGIN, active: true } }])
    expect(chromeStub.focusedWindowIds).toEqual([7])
  })

  it('still opens the dashboard when the bootstrap throws — the sign-in itself succeeded', async () => {
    vi.mocked(sync.postSignInBootstrap).mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await handleMessage({ type: 'SIGN_IN' })
    await flushSignInFlow()

    expect(chromeStub.createdTabUrls).toEqual([AUTO_LOGIN])
    expect(chromeStub.store.signin_in_progress).toBeUndefined()
  })
})

describe('dashboard events (runtime.onMessageExternal)', () => {
  it('signed-in from the dashboard runs a SILENT sign-in and opens no tab', async () => {
    const res = await dashboardEvent({ event: 'signed-in' }, fromDashboard)
    expect(res).toEqual({ ok: true })

    await flushSignInFlow()
    expect(auth.signInWithGoogle).toHaveBeenCalledWith({ silent: true })
    expect(sync.postSignInBootstrap).toHaveBeenCalled()
    // Lock: the dashboard caused this sign-in, so it must never open the
    // dashboard back — that is the loop between the two surfaces.
    expect(chromeStub.createdTabUrls).toEqual([])
    expect(chromeStub.updatedTabs).toEqual([])
    expect(chromeStub.store.signin_in_progress).toBeUndefined()
  })

  it('a failed silent sign-in clears the progress flag so the popup offers the button again', async () => {
    vi.mocked(auth.signInWithGoogle).mockResolvedValue({ failure: 'cancelled' })

    await dashboardEvent({ event: 'signed-in' }, fromDashboard)
    await flushSignInFlow()

    expect(chromeStub.store.signin_in_progress).toBeUndefined()
    expect(sync.postSignInBootstrap).not.toHaveBeenCalled()
    expect(chromeStub.createdTabUrls).toEqual([])
  })

  it('does nothing when the extension is already signed in', async () => {
    vi.mocked(auth.getSession).mockResolvedValue({ user: { id: 'user-1' } } as never)

    await dashboardEvent({ event: 'signed-in' }, fromDashboard)
    await flushSignInFlow()

    expect(auth.signInWithGoogle).not.toHaveBeenCalled()
  })

  it('probes Google at most once a minute while signed out', async () => {
    vi.mocked(auth.signInWithGoogle).mockResolvedValue({ failure: 'cancelled' })

    await dashboardEvent({ event: 'signed-in' }, fromDashboard)
    await flushSignInFlow()
    await dashboardEvent({ event: 'signed-in' }, fromDashboard)
    await flushSignInFlow()
    expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date(2026, 2, 14, 12, 1, 1))
    await dashboardEvent({ event: 'signed-in' }, fromDashboard)
    await flushSignInFlow()
    expect(auth.signInWithGoogle).toHaveBeenCalledTimes(2)
  })

  it('the popup button during a silent attempt joins it instead of starting a second flow', async () => {
    let finish: (value: auth.SignInOutcome) => void = () => undefined
    vi.mocked(auth.signInWithGoogle).mockReturnValue(new Promise((resolve) => { finish = resolve }))

    await dashboardEvent({ event: 'signed-in' }, fromDashboard)
    await handleMessage({ type: 'SIGN_IN' })
    finish({ failure: 'failed' })
    await flushSignInFlow()

    expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(chromeStub.store.signin_in_progress).toBeUndefined()
  })

  it('signed-out drops this device\'s session right away', async () => {
    const res = await dashboardEvent({ event: 'signed-out' }, fromDashboard)
    expect(res).toEqual({ ok: true })
    expect(auth.signOutLocally).toHaveBeenCalled()
  })

  it('rejects any other origin and any other shape without touching auth', async () => {
    const wrongOrigin = { origin: 'https://evil.example' } as chrome.runtime.MessageSender
    expect(await dashboardEvent({ event: 'signed-in' }, wrongOrigin)).toEqual({ ok: false })
    expect(await dashboardEvent({ event: 'signed-out' }, wrongOrigin)).toEqual({ ok: false })
    expect(await dashboardEvent({ event: 'steal-tokens' }, fromDashboard)).toEqual({ ok: false })
    expect(await dashboardEvent('signed-in', fromDashboard)).toEqual({ ok: false })

    await flushSignInFlow()
    expect(auth.signInWithGoogle).not.toHaveBeenCalled()
    expect(auth.signOutLocally).not.toHaveBeenCalled()
  })
})

describe('worker startup', () => {
  // The flow that set this flag lived in the previous worker's memory. Left
  // alone, the popup would sit on "connecting" with no flow behind it.
  it('drops a sign-in flag left by a previous worker', async () => {
    chromeStub.store.signin_in_progress = Date.now()
    vi.resetModules()
    await import('./index')
    await flushSignInFlow()

    expect(chromeStub.store.signin_in_progress).toBeUndefined()
  })
})
