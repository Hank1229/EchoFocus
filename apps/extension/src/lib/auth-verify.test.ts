import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'

vi.mock('./supabase', () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from './supabase'
import { verifySessionAlive } from './auth'

let chromeStub: ChromeStub
let getUserResult: { error: { status?: number } | null }
let hasSession: boolean
let signOutCalls: Array<{ scope?: string }>
let getUserCalls: number

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 8, 28, 12, 0, 0))
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  hasSession = true
  getUserResult = { error: null }
  signOutCalls = []
  getUserCalls = 0
  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: {
      getSession: async () => ({ data: { session: hasSession ? {} : null } }),
      getUser: async () => { getUserCalls++; return getUserResult },
      signOut: async (opts?: { scope?: string }) => { signOutCalls.push(opts ?? {}) },
    },
  } as never)
})

describe('verifySessionAlive — a dashboard sign-out reaches the extension', () => {
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
