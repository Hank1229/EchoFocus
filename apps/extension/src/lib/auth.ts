import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabase'

// Sign in with Google using chrome.identity.launchWebAuthFlow + implicit flow.
// Supabase must have the redirect URL in Auth → URL Configuration → Redirect URLs:
//   https://nihkocbmifcdifhhhekcllpelkfeoggl.chromiumapp.org/
//
// A failure says why, so the button that started it can tell the user.
// 'busy': Chrome runs one auth flow per extension at a time and one is still
// open — often a window the user lost track of — so nothing new can start
// until that one is finished or closed.
type SignInFailure = 'busy' | 'cancelled' | 'failed'
export type SignInOutcome = { session: Session } | { failure: SignInFailure }

// The account this device last signed in to, written the moment a sign-in
// succeeds and kept through sign-out. A sign-in the dashboard asks for is
// refused when it names a different account (lib/handoff.ts), so a web page
// can never move this device's history to another account on its own.
export const LINKED_USER_KEY = 'linked_user'

function flowFailure(err: unknown): SignInFailure {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('Only one web auth flow')) return 'busy'
  if (message.includes('did not approve')) return 'cancelled'
  return 'failed'
}

export async function signInWithGoogle(): Promise<SignInOutcome> {
  const supabase = getSupabaseClient()
  const redirectTo = chrome.identity.getRedirectURL()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Always show Google's account chooser so the user picks the account.
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error || !data.url) {
    console.error('[EchoFocus] OAuth: signInWithOAuth error:', error)
    return { failure: 'failed' }
  }

  let responseUrl: string | undefined
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true,
    })
  } catch (err) {
    console.error('[EchoFocus] OAuth: launchWebAuthFlow threw:', err)
    return { failure: flowFailure(err) }
  }

  if (!responseUrl) {
    console.error('[EchoFocus] OAuth: launchWebAuthFlow returned empty URL')
    return { failure: 'failed' }
  }

  // Chrome only resolves launchWebAuthFlow at the extension's own
  // chromiumapp.org origin, but that guarantee lives in the browser — assert
  // it here too so token parsing never runs on an unexpected URL.
  if (!responseUrl.startsWith(redirectTo)) {
    console.error('[EchoFocus] OAuth: response URL origin mismatch')
    return { failure: 'failed' }
  }

  const url = new URL(responseUrl)

  // Implicit flow: tokens are in the hash fragment (#access_token=...&refresh_token=...)
  const hashParams = new URLSearchParams(url.hash.slice(1))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (!accessToken || !refreshToken) {
    // SECURITY: never log the redirect URL, hash, or query — they carry tokens.
    console.error('[EchoFocus] OAuth: redirect completed but tokens were missing.',
      'This usually means flowType is not "implicit" — check supabase.ts.')
    return { failure: 'failed' }
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (sessionError || !sessionData.session) {
    console.error('[EchoFocus] OAuth: setSession error:', sessionError)
    return { failure: 'failed' }
  }

  // Options and the worker's SIGN_IN (popup, onboarding) both end here.
  await chrome.storage.local.set({ [LINKED_USER_KEY]: sessionData.session.user.id })
  console.log('[EchoFocus] OAuth: sign-in successful')
  return { session: sessionData.session }
}

// Keys that describe the account this device last synced to. The per-user
// markers (history_backfilled_user, prefs_bootstrapped_user, linked_user) and
// the retry queue stay: signing back in to the same account must not re-run
// the year-long backfill or the first-contact merge.
export const ACCOUNT_KEYS = ['last_sync_at', 'history_backfill_result', 'last_session_verify_at', 'pending_prefs_push']

// The extension and the dashboard each hold their own session, so this signs
// out the extension alone; the dashboard stays signed in. supabase-js drops
// the stored session even when the server cannot be reached, so the account
// keys go with it either way.
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.auth.signOut({ scope: 'local' })
  await chrome.storage.local.remove(ACCOUNT_KEYS)
}

// The server already revoked this session; only this device's copy is left
// to drop. storage.onChanged flips every open page.
async function signOutLocally(): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.auth.signOut({ scope: 'local' })
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  return data.session
}

// The service worker is killed constantly, so supabase-js never gets to run its
// background refresh timer: a stored access token can be hours expired while
// still looking like a valid session. Call this when the server rejects one.
// Returns null when the refresh token is dead too — the user must sign in again.
export async function refreshSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session) {
    console.warn('[EchoFocus] Session refresh failed; signing out locally.')
    await supabase.auth.signOut({ scope: 'local' })
    return null
  }
  return data.session
}

const LAST_VERIFY_KEY = 'last_session_verify_at'

// A session revoked server-side (the account deleted, a sign-out of every
// device elsewhere) keeps working locally until its stateless JWT expires.
// Ask the auth server, which checks revocation, on popup opens, throttled; a
// revoked session signs out locally, which flips every open page via
// storage.onChanged and stops the sync chain at once. A dashboard sign-out
// no longer lands here: it ends the dashboard's own session only. Network
// failures must never sign the user out.
export async function verifySessionAlive(minIntervalMs = 60_000): Promise<void> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) return

  const stored = await chrome.storage.local.get(LAST_VERIFY_KEY)
  const last = stored[LAST_VERIFY_KEY]
  if (typeof last === 'number' && Date.now() - last < minIntervalMs) return
  await chrome.storage.local.set({ [LAST_VERIFY_KEY]: Date.now() })

  const { error } = await supabase.auth.getUser()
  if (error && (error.status === 401 || error.status === 403)) {
    console.warn('[EchoFocus] Session revoked elsewhere; signing out locally.')
    await signOutLocally()
  }
}
