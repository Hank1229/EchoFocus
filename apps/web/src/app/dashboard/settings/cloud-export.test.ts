import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/client'
import { fetchCloudExport } from './cloud-export'

interface QueryLog {
  columns: string | null
  eq: [string, unknown][]
  gte: [string, unknown][]
  order: { column: string; ascending?: boolean } | null
}

type QueryResult = { data: unknown; error: { message: string } | null }

let logs: Record<string, QueryLog>
let results: Record<string, QueryResult>

const aggregateRow = { date: '2026-03-14', total_seconds: 3600, focus_score: 70, top_domains: [], productive_by_hour: [] }
const analysisRow = { date: '2026-03-14', type: 'daily', analysis_text: 'Steady.', focus_score: 70, created_at: '2026-03-14T13:00:00Z' }

// One builder per table, so each select string and filter can be checked on
// its own; awaiting the builder resolves that table's result.
function installFakeSupabase(): void {
  const client = {
    from(table: string) {
      const log: QueryLog = { columns: null, eq: [], gte: [], order: null }
      logs[table] = log
      const query = {
        select(columns: string) {
          log.columns = columns
          return query
        },
        eq(column: string, value: unknown) {
          log.eq.push([column, value])
          return query
        },
        gte(column: string, value: unknown) {
          log.gte.push([column, value])
          return query
        },
        order(column: string, options: { ascending?: boolean }) {
          log.order = { column, ...options }
          return query
        },
        then<TResult>(onFulfilled: (value: QueryResult) => TResult): Promise<TResult> {
          return Promise.resolve(results[table]!).then(onFulfilled)
        },
      }
      return query
    },
  }
  vi.mocked(createClient).mockReturnValue(client as unknown as ReturnType<typeof createClient>)
}

beforeEach(() => {
  logs = {}
  results = {
    synced_aggregates: { data: [aggregateRow], error: null },
    ai_analyses: { data: [analysisRow], error: null },
  }
  installFakeSupabase()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchCloudExport', () => {
  it('asks for every column of both rows, for the signed-in user only', async () => {
    await fetchCloudExport('user-1')

    const columns = (s: string | null) => (s ?? '').split(',').map(c => c.trim())
    expect(columns(logs.synced_aggregates!.columns)).toEqual([
      'date', 'total_seconds', 'productive_seconds', 'distraction_seconds', 'neutral_seconds',
      'uncategorized_seconds', 'focus_score', 'top_domains', 'productive_by_hour',
    ])
    expect(columns(logs.ai_analyses!.columns)).toEqual([
      'date', 'type', 'analysis_text', 'focus_score', 'created_at',
    ])
    expect(logs.synced_aggregates!.eq).toEqual([['user_id', 'user-1']])
    expect(logs.ai_analyses!.eq).toEqual([['user_id', 'user-1']])
  })

  it('covers today and the 29 days before it on the local calendar', async () => {
    // 00:30 local on 14 March: a UTC date here would already be 13 March
    // for anyone east of Greenwich, and 2026-02-12 instead of 02-13.
    await fetchCloudExport('user-1', new Date(2026, 2, 14, 0, 30))

    expect(logs.synced_aggregates!.gte).toEqual([['date', '2026-02-13']])
    expect(logs.ai_analyses!.gte).toEqual([['date', '2026-02-13']])
    expect(logs.synced_aggregates!.order).toEqual({ column: 'date', ascending: false })
  })

  it('returns both row sets under the export envelope when both queries succeed', async () => {
    const now = new Date(2026, 2, 14, 9, 0)
    expect(await fetchCloudExport('user-1', now)).toEqual({
      ok: true,
      data: {
        exported_at: now.toISOString(),
        range: 'last_30_days',
        synced_aggregates: [aggregateRow],
        ai_analyses: [analysisRow],
      },
    })
  })

  it('treats a null data set from a successful query as empty', async () => {
    results.ai_analyses = { data: null, error: null }
    const outcome = await fetchCloudExport('user-1')
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.data.ai_analyses).toEqual([])
  })

  it('fails, with the message, when the aggregates query errors', async () => {
    results.synced_aggregates = { data: null, error: { message: 'permission denied' } }
    expect(await fetchCloudExport('user-1')).toEqual({ ok: false, message: 'permission denied' })
  })

  it('fails when the analyses query errors even though the aggregates loaded', async () => {
    results.ai_analyses = { data: null, error: { message: 'timeout' } }
    expect(await fetchCloudExport('user-1')).toEqual({ ok: false, message: 'timeout' })
  })
})
