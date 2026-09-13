import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { DailyAggregate } from '@echofocus/shared'
import { installChromeStub } from '../test/chrome-stub'

vi.mock('./auth', () => ({ getSession: vi.fn() }))
vi.mock('../background/storage', () => ({ getAggregateForDate: vi.fn() }))

import { getSession } from './auth'
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

function signedIn(): void {
  vi.mocked(getSession).mockResolvedValue({ access_token: 'token-123' } as never)
}

function respondWith(init: { status: number; body: string }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(init.body, { status: init.status, statusText: init.status === 200 ? 'OK' : '' }),
    ),
  )
}

function lastRequest(): { url: string; init: RequestInit } {
  const mock = vi.mocked(globalThis.fetch)
  const [url, init] = mock.mock.calls[mock.mock.calls.length - 1] as [string, RequestInit]
  return { url, init }
}

function sentPayload(): {
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
  return JSON.parse(lastRequest().init.body as string)
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
  it('returns null and sends nothing when not signed in', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns null when the session carries no access token', async () => {
    vi.mocked(getSession).mockResolvedValue({ access_token: '' } as never)
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns null when there is no local aggregate for the date', async () => {
    vi.mocked(getAggregateForDate).mockResolvedValue(null)
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns null when the day has zero tracked seconds', async () => {
    vi.mocked(getAggregateForDate).mockResolvedValue(aggregate({ totalSeconds: 0 }))
    respondWith({ status: 200, body: '{}' })

    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
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
      analysisText: 'Great focus today.',
      focusScore: 81,
      analyzedAt: NOW,
    })
  })

  it('surfaces the stored analysis returned alongside a 429 cap', async () => {
    respondWith({
      status: 429,
      body: JSON.stringify({ error: 'Daily limit reached', analysis_text: 'Yesterday\'s take.' }),
    })

    expect(await requestAiAnalysis('2026-03-14')).toEqual({
      analysisText: 'Yesterday\'s take.',
      // The cached text carries no score — the local aggregate's score is used
      focusScore: 67,
      analyzedAt: NOW,
    })
  })

  it('returns null for a 429 that carries no stored analysis', async () => {
    respondWith({ status: 429, body: JSON.stringify({ error: 'Daily limit reached' }) })
    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
  })

  it('returns null for a 429 whose stored analysis is an empty string', async () => {
    respondWith({ status: 429, body: JSON.stringify({ analysis_text: '' }) })
    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
  })

  it('returns null for any other error status', async () => {
    respondWith({ status: 500, body: 'Internal Server Error' })
    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
  })

  it('returns null for a non-JSON success body instead of throwing', async () => {
    respondWith({ status: 200, body: '<html>gateway</html>' })
    await expect(requestAiAnalysis('2026-03-14')).resolves.toBeNull()
  })

  it('returns null when the success body is missing the expected fields', async () => {
    respondWith({ status: 200, body: JSON.stringify({ analysis_text: 'text' }) })
    expect(await requestAiAnalysis('2026-03-14')).toBeNull()
  })

  it('returns null when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(requestAiAnalysis('2026-03-14')).resolves.toBeNull()
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
