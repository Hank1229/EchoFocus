import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'

vi.mock('./supabase', () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from './supabase'
import { refreshSession, signOut, verifySessionAlive } from './auth'

let chromeStub: ChromeStub
let getUserResult: { error: { status?: number } | null }
let hasSession: boolean
let signOutCalls: Array<{ scope?: string }>
let signOutError: { message: string } | null
let getUserCalls: number

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 28, 12, 0, 0))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  hasSession = true
  getUserResult = { error: null }
  signOutCalls = []
  signOutError = null
  getUserCalls = 0
  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: {
      getSession: async () => ({ data: { session: hasSession ? {} : null } }),
      getUser: async () => { getUserCalls++; return getUserResult },
      signOut: async (opts?: { scope?: string }) => { signOutCalls.push(opts ?? {}); return { error: signOutError } },
      refreshSession: async () => ({ data: { session: null }, error: { message: 'refresh token revoked' } }),
    },
  } as never)
})

describe('verifySessionAlive — a session revoked server-side reaches the extension', () => {
  it('a revoked session (401) signs out locally', async () => {
    getUserResult = { error: { status: 401 } }
    await verifySessionAlive()
    expect(signOutCalls).toEqual([{ scope: 'local' }])
  })

  it('a network failure never signs the user out', async () => {
    getUserResult = { error: { status: undefined } }
    await verifySessionAlive()
    expect(signOutCalls).toEqual([])
  })

  it('runs at most once per interval, and not at all signed out', async () => {
    await verifySessionAlive()
    await verifySessionAlive()
    expect(getUserCalls).toBe(1)

    vi.setSystemTime(new Date(2026, 8, 28, 12, 1, 1))
    await verifySessionAlive()
    expect(getUserCalls).toBe(2)

    hasSession = false
    vi.setSystemTime(new Date(2026, 8, 28, 12, 3, 0))
    await verifySessionAlive()
    expect(getUserCalls).toBe(2)
  })
})

describe('signOut — the extension signs out alone', () => {
  const accountKeys = {
    last_sync_at: '2026-09-28T10:00:00.000Z',
    history_backfill_result: { days: 12, at: '2026-09-20T10:00:00.000Z' },
    last_session_verify_at: 1,
    pending_prefs_push: ['settings'],
  }
  const keptKeys = {
    pending_sync_dates: ['2026-09-27'],
    history_backfilled_user: 'user-a',
    prefs_bootstrapped_user: 'user-a',
    linked_user: 'user-a',
    'ai_analysis:2026-09-27': { analysisText: 'x' },
  }

  it('ends only this session and clears what described the account', async () => {
    chromeStub.store = { ...accountKeys, ...keptKeys }
    await signOut()
    expect(signOutCalls).toEqual([{ scope: 'local' }])
    expect(chromeStub.store).toEqual(keptKeys)
  })

  it('clears them even when the server could not be told', async () => {
    chromeStub.store = { ...accountKeys, ...keptKeys }
    signOutError = { message: 'network' }
    await signOut()
    expect(chromeStub.store).toEqual(keptKeys)
  })

  it('a dead refresh token drops this session only', async () => {
    expect(await refreshSession()).toBeNull()
    expect(signOutCalls).toEqual([{ scope: 'local' }])
  })
})
