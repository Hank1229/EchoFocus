// Minimal in-memory stand-in for the slice of PostgREST the extension uses:
// select/eq/maybeSingle, upsert with onConflict, and delete with eq/not-in.
// Rows live in a plain object keyed by table name so a test can assert on the
// real column names, and every executed request is recorded in order.

import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

export interface StubRequest {
  table: string
  op: 'select' | 'upsert' | 'delete'
  /** Rows sent by an upsert, exactly as the caller built them. */
  rows?: Row[]
  options?: Record<string, unknown>
}

export interface SupabaseStub {
  /** Table contents. Assign directly to seed a test. */
  rows: Record<string, Row[]>
  /** Every request that reached the stub, in order. */
  requests: StubRequest[]
  /** Statuses handed to the next requests, consumed one per request. Empty means 200. */
  statuses: number[]
  /** Tables whose requests come back as a PostgREST error. `table` fails every
   *  request; `table:op` fails only that operation, which is how a test makes a
   *  write fail while the matching read still works. */
  failing: Set<string>
  client: SupabaseClient
}

interface Filter {
  column: string
  kind: 'eq' | 'notIn'
  value: unknown
}

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) =>
    filter.kind === 'eq'
      ? row[filter.column] === filter.value
      : !(filter.value as Set<unknown>).has(row[filter.column]),
  )
}

export function installSupabaseStub(): SupabaseStub {
  const stub: SupabaseStub = {
    rows: {},
    requests: [],
    statuses: [],
    failing: new Set(),
    client: null as unknown as SupabaseClient,
  }

  function table(name: string): Row[] {
    stub.rows[name] ??= []
    return stub.rows[name]
  }

  function builder(name: string, op: StubRequest['op'], rows?: Row[], options?: Record<string, unknown>) {
    const filters: Filter[] = []
    let single = false

    function execute() {
      const status = stub.statuses.shift() ?? 200
      stub.requests.push({ table: name, op, rows, options })

      if (status === 401) {
        return { data: null, error: { message: 'JWT expired' }, status }
      }

      if (stub.failing.has(name) || stub.failing.has(`${name}:${op}`)) {
        return { data: null, error: { message: 'network down' }, status: 500 }
      }

      if (op === 'select') {
        const found = table(name).filter((row) => matches(row, filters))
        return { data: single ? (found[0] ?? null) : found, error: null, status }
      }

      if (op === 'upsert') {
        const keys = String(options?.onConflict ?? 'id').split(',')
        for (const incoming of rows ?? []) {
          const index = table(name).findIndex((row) => keys.every((key) => row[key] === incoming[key]))
          if (index === -1) table(name).push({ ...incoming })
          else table(name)[index] = { ...table(name)[index], ...incoming }
        }
        return { data: null, error: null, status }
      }

      stub.rows[name] = table(name).filter((row) => !matches(row, filters))
      return { data: null, error: null, status }
    }

    const query = {
      select: () => query,
      eq(column: string, value: unknown) {
        filters.push({ column, kind: 'eq', value })
        return query
      },
      not(column: string, _operator: string, list: string) {
        const values = list.replace(/^\(|\)$/g, '').split(',')
        filters.push({ column, kind: 'notIn', value: new Set(values) })
        return query
      },
      maybeSingle() {
        single = true
        return query
      },
      then<T>(onFulfilled: (value: ReturnType<typeof execute>) => T) {
        return Promise.resolve().then(() => onFulfilled(execute()))
      },
    }
    return query
  }

  stub.client = {
    from(name: string) {
      return {
        select: (_columns?: string) => builder(name, 'select'),
        upsert: (rows: Row | Row[], options?: Record<string, unknown>) =>
          builder(name, 'upsert', Array.isArray(rows) ? rows : [rows], options),
        delete: () => builder(name, 'delete'),
      }
    },
  } as unknown as SupabaseClient

  return stub
}
