import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installChromeStub } from '../test/chrome-stub'

vi.mock('./supabase', () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from './supabase'
import { signInWithGoogle } from './auth'

let oauthOptions: Record<string, unknown> | undefined
let flowRequests: Array<{ url: string; interactive?: boolean }>
let flowResponse: string | undefined | Error
let setSessionCalls: number

beforeEach(() => {
  installChromeStub()
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  oauthOptions = undefined
  flowRequests = []
  flowResponse = undefined
  setSessionCalls = 0
  chrome.identity.launchWebAuthFlow = async (details) => {
    flowRequests.push({ url: details.url, interactive: details.interactive })
    if (flowResponse instanceof Error) throw flowResponse
    return flowResponse
  }
  vi.mocked(getSupabaseClient).mockReturnValue({
    auth: {
      signInWithOAuth: async ({ options }: { options: Record<string, unknown> }) => {
        oauthOptions = options
        return { data: { url: 'https://auth.test/authorize' }, error: null }
      },
      setSession: async () => { setSessionCalls++; return { data: { session: { user: { id: 'u' } } }, error: null } },
    },
  } as never)
})

describe('signInWithGoogle', () => {
  it('runs an interactive flow that always asks which account', async () => {
    await signInWithGoogle()
    expect(flowRequests).toEqual([{ url: 'https://auth.test/authorize', interactive: true }])
    expect(oauthOptions?.queryParams).toEqual({ prompt: 'select_account' })
  })

  it('a completed flow sets the session', async () => {
    flowResponse = 'https://echofocus-test.chromiumapp.org/#access_token=a&refresh_token=r'
    expect(await signInWithGoogle()).toEqual({ session: { user: { id: 'u' } } })
    expect(setSessionCalls).toBe(1)
  })

  it('a redirect without tokens is a failure and never sets a session', async () => {
    flowResponse = 'https://echofocus-test.chromiumapp.org/#error=access_denied'
    expect(await signInWithGoogle()).toEqual({ failure: 'failed' })
    expect(setSessionCalls).toBe(0)
  })
})

describe('signInWithGoogle — why a sign-in failed', () => {
  // Chrome allows one auth flow per extension. A window left open blocks every
  // later press, and a bare null made that press look like nothing happened.
  it('reports busy when Chrome refuses a second flow while one is still open', async () => {
    flowResponse = new Error('Only one web auth flow is allowed at a time.')
    expect(await signInWithGoogle()).toEqual({ failure: 'busy' })
  })

  it('reports cancelled when the user closes the Google window', async () => {
    flowResponse = new Error('The user did not approve access.')
    expect(await signInWithGoogle()).toEqual({ failure: 'cancelled' })
  })
})
