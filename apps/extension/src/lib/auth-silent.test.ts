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
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
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

describe('signInWithGoogle — silent mode', () => {
  it('runs hidden with prompt=none so Google answers instead of asking', async () => {
    await signInWithGoogle({ silent: true })
    expect(flowRequests).toEqual([{ url: 'https://auth.test/authorize', interactive: false }])
    expect(oauthOptions?.queryParams).toEqual({ prompt: 'none' })
  })

  it('interactive by default, with no prompt override', async () => {
    await signInWithGoogle()
    expect(flowRequests[0].interactive).toBe(true)
    expect(oauthOptions?.queryParams).toBeUndefined()
  })

  it('a declined silent flow (Chrome rejects, or Google redirects without tokens) is a quiet failure', async () => {
    flowResponse = new Error('User interaction required.')
    expect(await signInWithGoogle({ silent: true })).toEqual({ failure: 'failed' })

    flowResponse = 'https://echofocus-test.chromiumapp.org/#error=interaction_required'
    expect(await signInWithGoogle({ silent: true })).toEqual({ failure: 'failed' })

    expect(setSessionCalls).toBe(0)
    expect(console.error).not.toHaveBeenCalled()
  })

  it('a completed silent flow sets the session like the interactive one', async () => {
    flowResponse = 'https://echofocus-test.chromiumapp.org/#access_token=a&refresh_token=r'
    const outcome = await signInWithGoogle({ silent: true })
    expect(outcome).toEqual({ session: { user: { id: 'u' } } })
    expect(setSessionCalls).toBe(1)
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
