import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/client'
import { requestAiAnalysis, requestWeeklyAnalysis } from './ai'

const FUNCTIONS_URL = 'https://project.test.invalid/functions/v1'

interface AggregateRow {
  date?: string
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
  top_domains: { domain: string; seconds: number; category: string }[] | null
}

interface QueryLog {
  table: string | null
  columns: string | null
  eq: [string, unknown][]
  order: { column: string; ascending?: boolean } | null
  limit: number | null
  maybeSingleCalled: boolean
}

let queryLog: QueryLog
let queryResult: { data: unknown; error: { message: string } | null }
let session: { access_token: string; user: { id: string } } | null

function row(overrides: Partial<AggregateRow> = {}): AggregateRow {
  return {
    total_seconds: 3630, // 60.5 min → 61
    productive_seconds: 1800,
    distraction_seconds: 900,
    neutral_seconds: 600,
    uncategorized_seconds: 330,
    focus_score: 67,
    top_domains: [{ domain: 'github.com', seconds: 1800, category: 'productive' }],
    ...overrides,
  }
}

function installFakeSupabase(): void {
  const query = {
    select(columns: string) {
      queryLog.columns = columns
      return query
    },
    eq(column: string, value: unknown) {
      queryLog.eq.push([column, value])
      return query
    },
    order(column: string, options: { ascending?: boolean }) {
      queryLog.order = { column, ...options }
      return query
    },
    limit(count: number) {
      queryLog.limit = count
      return query
    },
    maybeSingle() {
      queryLog.maybeSingleCalled = true
      return Promise.resolve(queryResult)
    },
    // Awaiting the builder itself (the weekly path) resolves the result.
    then<TResult>(onFulfilled: (value: typeof queryResult) => TResult): Promise<TResult> {
      return Promise.resolve(queryResult).then(onFulfilled)
    },
  }

  const client = {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
    },
    from(table: string) {
      queryLog.table = table
      return query
    },
  }

  vi.mocked(createClient).mockReturnValue(client as unknown as ReturnType<typeof createClient>)
}

function respondWith(status: number, body: string, statusText = ''): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, statusText })))
}

function lastRequest(): { url: string; init: RequestInit } {
  const mock = vi.mocked(globalThis.fetch)
  const [url, init] = mock.mock.calls[mock.mock.calls.length - 1] as [string, RequestInit]
  return { url, init }
}

function sentPayload(): Record<string, unknown> {
  return JSON.parse(lastRequest().init.body as string)
}

beforeEach(() => {
  queryLog = { table: null, columns: null, eq: [], order: null, limit: null, maybeSingleCalled: false }
  queryResult = { data: row(), error: null }
  session = { access_token: 'token-123', user: { id: 'user-1' } }
  installFakeSupabase()
  respondWith(200, JSON.stringify({ analysis_text: 'Great focus.', focus_score: 81 }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('requestAiAnalysis — outcomes', () => {
  it('reports not-signed-in without querying or fetching', async () => {
    session = null
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'not-signed-in',
    })
    expect(queryLog.table).toBeNull()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('reports no-data when the day has not been synced', async () => {
    queryResult = { data: null, error: null }
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'no-data',
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('surfaces a database error as request-failed with its message', async () => {
    queryResult = { data: null, error: { message: 'permission denied' } }
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: 'permission denied',
    })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('returns success with the analysis text and score', async () => {
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'success',
      analysisText: 'Great focus.',
      focusScore: 81,
    })
  })

  it('queries the requested date for the signed-in user only', async () => {
    await requestAiAnalysis('2026-03-14', 'en')
    expect(queryLog.table).toBe('synced_aggregates')
    expect(queryLog.eq).toEqual([
      ['user_id', 'user-1'],
      ['date', '2026-03-14'],
    ])
    expect(queryLog.maybeSingleCalled).toBe(true)
  })
})

describe('requestAiAnalysis — the request it sends', () => {
  it('POSTs to the ai-analyze Edge Function with both auth headers', async () => {
    await requestAiAnalysis('2026-03-14', 'en')
    const { url, init } = lastRequest()
    expect(url).toBe(`${FUNCTIONS_URL}/ai-analyze`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      apikey: 'anon-test-key',
      Authorization: 'Bearer token-123',
    })
  })

  it('converts seconds to rounded minutes', async () => {
    await requestAiAnalysis('2026-03-14', 'en')
    expect(sentPayload()).toMatchObject({
      date: '2026-03-14',
      language: 'en',
      aggregate: {
        date: '2026-03-14',
        totalMinutes: 61,
        productiveMinutes: 30,
        distractionMinutes: 15,
        focusScore: 67,
      },
    })
  })

  it('merges uncategorized seconds into neutralMinutes', async () => {
    await requestAiAnalysis('2026-03-14', 'en')
    // (600 + 330) / 60 = 15.5 → 16. Rounding each separately would give 10 + 6.
    const payload = sentPayload().aggregate as { neutralMinutes: number }
    expect(payload.neutralMinutes).toBe(16)
  })

  it('slices topDomains to the top 8', async () => {
    const top_domains = Array.from({ length: 12 }, (_, i) => ({
      domain: `site-${i}.test`,
      seconds: 1200 - i * 10,
      category: 'neutral',
    }))
    queryResult = { data: row({ top_domains }), error: null }

    await requestAiAnalysis('2026-03-14', 'en')

    const domains = (sentPayload().aggregate as { topDomains: unknown[] }).topDomains
    expect(domains).toHaveLength(8)
    expect(domains[0]).toEqual({ domain: 'site-0.test', minutes: 20, category: 'neutral' })
  })

  it('tolerates a null top_domains column', async () => {
    queryResult = { data: row({ top_domains: null }), error: null }
    await requestAiAnalysis('2026-03-14', 'en')
    expect((sentPayload().aggregate as { topDomains: unknown[] }).topDomains).toEqual([])
  })

  it('forwards the requested language', async () => {
    await requestAiAnalysis('2026-03-14', 'zh-TW')
    expect(sentPayload().language).toBe('zh-TW')
  })
})

describe('requestAiAnalysis — error and cap handling', () => {
  it('returns the stored analysis as "cached" when the daily cap (429) is hit', async () => {
    respondWith(429, JSON.stringify({ error: 'Daily limit', analysis_text: 'Earlier take.' }))
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'cached',
      analysisText: 'Earlier take.',
      // The cached text carries no score of its own — the row's score is used
      focusScore: 67,
    })
  })

  it('surfaces a 429 with no stored analysis as the quota reason — the client owns the wording', async () => {
    respondWith(429, JSON.stringify({ error: 'Daily limit' }))
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'daily-quota',
    })
  })

  it('surfaces a 429 with an empty analysis string as the quota reason', async () => {
    respondWith(429, JSON.stringify({ analysis_text: '' }), 'Too Many Requests')
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'daily-quota',
    })
  })

  it('uses the JSON error field as the message', async () => {
    respondWith(500, JSON.stringify({ error: 'Gemini upstream failed' }), 'Internal Server Error')
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: 'Gemini upstream failed',
    })
  })

  it('falls back to statusText when the body is not JSON', async () => {
    respondWith(502, '<html>bad gateway</html>', 'Bad Gateway')
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: 'Bad Gateway',
    })
  })

  it('leaves the message undefined when statusText is empty (HTTP/2)', async () => {
    // Over HTTP/2 statusText is always '' — an empty message must become
    // undefined so callers show their own localized generic error.
    respondWith(502, '<html>bad gateway</html>', '')
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: undefined,
    })
  })

  it('leaves the message undefined when the JSON error field is empty', async () => {
    respondWith(500, JSON.stringify({ error: '' }), '')
    const outcome = await requestAiAnalysis('2026-03-14', 'en')
    expect(outcome).toEqual({ status: 'error', reason: 'request-failed', message: undefined })
  })

  it('ignores a non-object JSON error body', async () => {
    respondWith(500, '"just a string"', '')
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: undefined,
    })
  })

  it('degrades a non-JSON 200 body to request-failed instead of throwing', async () => {
    respondWith(200, 'not json at all')
    await expect(requestAiAnalysis('2026-03-14', 'en')).resolves.toEqual({
      status: 'error',
      reason: 'request-failed',
    })
  })

  it('reports a network failure with the thrown error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: 'Failed to fetch',
    })
  })

  it('reports a non-Error throw without a message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw 'nope' }))
    expect(await requestAiAnalysis('2026-03-14', 'en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: undefined,
    })
  })
})

describe('requestWeeklyAnalysis', () => {
  const week = [
    // Supabase returns newest first (order date desc)
    { ...row({ total_seconds: 600, focus_score: 90 }), date: '2026-03-14' },
    { ...row({ total_seconds: 600, focus_score: 70 }), date: '2026-03-13' },
    { ...row({ total_seconds: 600, focus_score: 61 }), date: '2026-03-12' },
  ]

  it('reports not-signed-in without querying', async () => {
    session = null
    expect(await requestWeeklyAnalysis('en')).toEqual({
      status: 'error',
      reason: 'not-signed-in',
    })
    expect(queryLog.table).toBeNull()
  })

  it('asks for the 7 most recent days', async () => {
    queryResult = { data: week, error: null }
    await requestWeeklyAnalysis('en')
    expect(queryLog.order).toEqual({ column: 'date', ascending: false })
    expect(queryLog.limit).toBe(7)
    expect(queryLog.eq).toEqual([['user_id', 'user-1']])
    expect(queryLog.columns).toContain('date')
  })

  it('reports no-data for an empty week', async () => {
    queryResult = { data: [], error: null }
    expect(await requestWeeklyAnalysis('en')).toEqual({ status: 'error', reason: 'no-data' })
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('reports no-data when the query returns null', async () => {
    queryResult = { data: null, error: null }
    expect(await requestWeeklyAnalysis('en')).toEqual({ status: 'error', reason: 'no-data' })
  })

  it('surfaces a database error', async () => {
    queryResult = { data: null, error: { message: 'rls denied' } }
    expect(await requestWeeklyAnalysis('en')).toEqual({
      status: 'error',
      reason: 'request-failed',
      message: 'rls denied',
    })
  })

  it('sends the days OLDEST first so the summary is stored under the latest date', async () => {
    queryResult = { data: week, error: null }
    await requestWeeklyAnalysis('en')

    const payload = sentPayload() as { type: string; language: string; aggregates: { date: string }[] }
    expect(payload.type).toBe('weekly')
    expect(payload.language).toBe('en')
    expect(payload.aggregates.map((a) => a.date)).toEqual(['2026-03-12', '2026-03-13', '2026-03-14'])
  })

  it('maps each day through the same seconds→minutes conversion', async () => {
    queryResult = { data: week, error: null }
    await requestWeeklyAnalysis('en')

    const payload = sentPayload() as { aggregates: Record<string, unknown>[] }
    expect(payload.aggregates[0]).toEqual({
      date: '2026-03-12',
      totalMinutes: 10,
      productiveMinutes: 30,
      distractionMinutes: 15,
      neutralMinutes: 16,
      focusScore: 61,
      topDomains: [{ domain: 'github.com', minutes: 30, category: 'productive' }],
    })
  })

  it('uses the rounded average focus score for a capped (429) weekly summary', async () => {
    queryResult = { data: week, error: null }
    respondWith(429, JSON.stringify({ analysis_text: 'Last week\'s retro.' }))

    // (90 + 70 + 61) / 3 = 73.67 → 74
    expect(await requestWeeklyAnalysis('en')).toEqual({
      status: 'cached',
      analysisText: 'Last week\'s retro.',
      focusScore: 74,
    })
  })

  it('returns success for a fresh weekly generation', async () => {
    queryResult = { data: week, error: null }
    respondWith(200, JSON.stringify({ analysis_text: 'Weekly retro.', focus_score: 74 }))
    expect(await requestWeeklyAnalysis('en')).toEqual({
      status: 'success',
      analysisText: 'Weekly retro.',
      focusScore: 74,
    })
  })
})
