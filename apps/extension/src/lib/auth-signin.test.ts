import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'

vi.mock('./supabase', () => ({ getSupabaseClient: vi.fn() }))

import { getSupabaseClient } from './supabase'
import { signInWithGoogle } from './auth'

let oauthOptions: Record<string, unknown> | undefined
let flowRequests: Array<{ url: string; interactive?: boolean }>
let flowResponse: string | undefined | Error
let setSessionCalls: number
let chromeStub: ChromeStub

beforeEach(() => {
  chromeStub = installChromeStub()
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

// Options calls signInWithGoogle in its own page and the worker's SIGN_IN
// (popup, onboarding) calls it too, so this is the write both paths make.
describe('signInWithGoogle — linked_user', () => {
  it('records the signed-in account as soon as the session is set', async () => {
    flowResponse = 'https://echofocus-test.chromiumapp.org/#access_token=a&refresh_token=r'
    await signInWithGoogle()
    expect(chromeStub.store.linked_user).toBe('u')
  })

  it('a failed sign-in leaves the previous account in place', async () => {
    chromeStub.store.linked_user = 'earlier-user'
    flowResponse = new Error('The user did not approve access.')
    await signInWithGoogle()
    expect(chromeStub.store.linked_user).toBe('earlier-user')
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
