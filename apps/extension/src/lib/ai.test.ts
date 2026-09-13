import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { DailyAggregate } from '@echofocus/shared'
import { installChromeStub } from '../test/chrome-stub'

vi.mock('./auth', () => ({ getSession: vi.fn(), refreshSession: vi.fn() }))
vi.mock('../background/storage', () => ({ getAggregateForDate: vi.fn() }))

import { getSession, refreshSession } from './auth'
import { getAggregateForDate } from '../background/storage'
import { requestAiAnalysis } from './ai'

const FUNCTIONS_URL = 'https://functions.test.invalid'
const NOW = new Date(2026, 2, 14, 21, 0, 0).getTime()

function aggregate(overrides: Partial<DailyAggregate> = {}): DailyAggregate {
  return {
    date: '2026-03-14',
    totalSeconds: 3630, // 60.5 min → rounds to 61
    productiveSeconds: 1800,
    distractionSeconds: 900,
    neutralSeconds: 600,
    uncategorizedSeconds: 330,
    topDomains: [{ domain: 'github.com', seconds: 1800, category: 'productive' }],
    focusScore: 67,
    ...overrides,
  }
}

function signedIn(token = 'token-123'): void {
  vi.mocked(getSession).mockResolvedValue({ access_token: token } as never)
}

/** Queue one fetch response per call, in order. */
function respondWithSequence(...responses: { status: number; body: string }[]): void {
  const fn = vi.fn()
  for (const r of responses) {
    fn.mockImplementationOnce(async () =>
      new Response(r.body, { status: r.status, statusText: r.status === 200 ? 'OK' : '' }),
    )
  }
  vi.stubGlobal('fetch', fn)
}

function respondWith(init: { status: number; body: string }): void {
  respondWithSequence(init)
}

function requestAt(index: number): { url: string; init: RequestInit } {
  const mock = vi.mocked(globalThis.fetch)
  const [url, init] = mock.mock.calls[index] as [string, RequestInit]
  return { url, init }
}

function lastRequest(): { url: string; init: RequestInit } {
  const mock = vi.mocked(globalThis.fetch)
  return requestAt(mock.mock.calls.length - 1)
}

function sentPayload(callIndex = -1): {
  date: string
  language: string
  aggregate: {
    date: string
    totalMinutes: number
    productiveMinutes: number
    distractionMinutes: number
    neutralMinutes: number
    focusScore: number
    topDomains: { domain: string; minutes: number; category: string }[]
  }
} {
  const req = callIndex === -1 ? lastRequest() : requestAt(callIndex)
  return JSON.parse(req.init.body as string)
}

beforeEach(() => {
  installChromeStub()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW))
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(getAggregateForDate).mockResolvedValue(aggregate())
  signedIn()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('requestAiAnalysis gates', () => {
  it('reports signed-out and sends nothing when there is no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'signed-out' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('reports signed-out when the session carries no access token', async () => {
    vi.mocked(getSession).mockResolvedValue({ access_token: '' } as never)
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'signed-out' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('reports no-data when there is no local aggregate for the date', async () => {
    vi.mocked(getAggregateForDate).mockResolvedValue(null)
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'no-data' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('reports no-data when the day has zero tracked seconds', async () => {
    vi.mocked(getAggregateForDate).mockResolvedValue(aggregate({ totalSeconds: 0 }))
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'no-data' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

describe('the payload sent to the Edge Function', () => {
  beforeEach(() => {
    respondWith({ status: 200, body: JSON.stringify({ analysis_text: 'ok', focus_score: 67 }) })
  })

  it('POSTs to /ai-analyze with the bearer token', async () => {
    await requestAiAnalysis('2026-03-14')
    const { url, init } = lastRequest()
    expect(url).toBe(`${FUNCTIONS_URL}/ai-analyze`)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-123',
    })
  })

  it('converts seconds to rounded minutes', async () => {
    await requestAiAnalysis('2026-03-14')
    expect(sentPayload().aggregate).toMatchObject({
      totalMinutes: 61, // 3630s
      productiveMinutes: 30,
      distractionMinutes: 15,
    })
  })

  it('merges uncategorized time into neutralMinutes', async () => {
    await requestAiAnalysis('2026-03-14')
    // (600 + 330) / 60 = 15.5 → 16
    expect(sentPayload().aggregate.neutralMinutes).toBe(16)
  })

  it('caps topDomains at 8 entries', async () => {
    const topDomains = Array.from({ length: 10 }, (_, i) => ({
      domain: `site-${i}.test`,
      seconds: 600 - i,
      category: 'neutral' as const,
    }))
    vi.mocked(getAggregateForDate).mockResolvedValue(aggregate({ topDomains }))

    await requestAiAnalysis('2026-03-14')

    const sent = sentPayload().aggregate.topDomains
    expect(sent).toHaveLength(8)
    expect(sent[0]).toEqual({ domain: 'site-0.test', minutes: 10, category: 'neutral' })
  })

  it('sends no URLs or page titles', async () => {
    await requestAiAnalysis('2026-03-14')
    const body = lastRequest().init.body as string
    expect(body).not.toContain('http')
    expect(body).not.toContain('title')
  })

  it('defaults the language to English and forwards an explicit one', async () => {
    await requestAiAnalysis('2026-03-14')
    expect(sentPayload().language).toBe('en')

    await requestAiAnalysis('2026-03-14', 'zh-TW')
    expect(sentPayload().language).toBe('zh-TW')
  })
})

describe('response handling', () => {
  it('returns the analysis on success, stamped with the current time', async () => {
    respondWith({
      status: 200,
      body: JSON.stringify({ analysis_text: 'Great focus today.', focus_score: 81 }),
    })

    expect(await requestAiAnalysis('2026-03-14')).toEqual({
      ok: true,
      result: { analysisText: 'Great focus today.', focusScore: 81, analyzedAt: NOW },
    })
  })

  it('surfaces the stored analysis returned alongside a 429 cap', async () => {
    respondWith({
      status: 429,
      body: JSON.stringify({ error: 'Daily limit reached', analysis_text: 'Yesterday\'s take.' }),
    })

    expect(await requestAiAnalysis('2026-03-14')).toEqual({
      ok: true,
      result: {
        analysisText: 'Yesterday\'s take.',
        // The cached text carries no score — the local aggregate's score is used
        focusScore: 67,
        analyzedAt: NOW,
      },
    })
  })

  it('reports unavailable for a 429 that carries no stored analysis', async () => {
    respondWith({ status: 429, body: JSON.stringify({ error: 'Daily limit reached' }) })
    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('reports unavailable for a 429 whose stored analysis is an empty string', async () => {
    respondWith({ status: 429, body: JSON.stringify({ analysis_text: '' }) })
    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('reports unavailable for any other error status', async () => {
    respondWith({ status: 500, body: 'Internal Server Error' })
    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('reports unavailable for a non-JSON success body instead of throwing', async () => {
    respondWith({ status: 200, body: '<html>gateway</html>' })
    await expect(requestAiAnalysis('2026-03-14')).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('reports unavailable when the success body is missing the expected fields', async () => {
    respondWith({ status: 200, body: JSON.stringify({ analysis_text: 'text' }) })
    expect(await requestAiAnalysis('2026-03-14')).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('reports unavailable when fetch rejects, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(requestAiAnalysis('2026-03-14')).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })

  it('never logs the analysis text', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    respondWith({
      status: 200,
      body: JSON.stringify({ analysis_text: 'SECRET-USER-DATA', focus_score: 50 }),
    })

    await requestAiAnalysis('2026-03-14')

    const logged = log.mock.calls.flat().map(String).join(' ')
    expect(logged).not.toContain('SECRET-USER-DATA')
  })
})

describe('401 handling — refresh and retry once', () => {
  it('refreshes the session once and retries with the new token on success', async () => {
    respondWithSequence(
      { status: 401, body: '{}' },
      { status: 200, body: JSON.stringify({ analysis_text: 'Refreshed take.', focus_score: 70 }) },
    )
    vi.mocked(refreshSession).mockResolvedValue({ access_token: 'token-456' } as never)

    const outcome = await requestAiAnalysis('2026-03-14')

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({
      ok: true,
      result: { analysisText: 'Refreshed take.', focusScore: 70, analyzedAt: NOW },
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(requestAt(0).init.headers).toMatchObject({ Authorization: 'Bearer token-123' })
    expect(requestAt(1).init.headers).toMatchObject({ Authorization: 'Bearer token-456' })
  })

  it('reports session-expired without retrying when refresh fails', async () => {
    respondWithSequence({ status: 401, body: '{}' })
    vi.mocked(refreshSession).mockResolvedValue(null)

    const outcome = await requestAiAnalysis('2026-03-14')

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({ ok: false, reason: 'session-expired' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('reports session-expired and stops after the retry also returns 401', async () => {
    respondWithSequence(
      { status: 401, body: '{}' },
      { status: 401, body: '{}' },
    )
    vi.mocked(refreshSession).mockResolvedValue({ access_token: 'token-456' } as never)

    const outcome = await requestAiAnalysis('2026-03-14')

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({ ok: false, reason: 'session-expired' })
    // No infinite retry loop: exactly the original attempt plus one retry.
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
