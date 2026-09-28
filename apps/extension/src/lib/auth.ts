import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabase'

// Sign in with Google using chrome.identity.launchWebAuthFlow + implicit flow.
// Supabase must have the redirect URL in Auth → URL Configuration → Redirect URLs:
//   https://nihkocbmifcdifhhhekcllpelkfeoggl.chromiumapp.org/
export async function signInWithGoogle(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const redirectTo = chrome.identity.getRedirectURL()

  console.log('[EchoFocus] OAuth: redirectTo =', redirectTo)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    console.error('[EchoFocus] OAuth: signInWithOAuth error:', error)
    return null
  }

  console.log('[EchoFocus] OAuth: opening auth URL via launchWebAuthFlow')

  let responseUrl: string | undefined
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true,
    })
  } catch (err) {
    console.error('[EchoFocus] OAuth: launchWebAuthFlow threw:', err)
    return null
  }

  if (!responseUrl) {
    console.error('[EchoFocus] OAuth: launchWebAuthFlow returned empty URL')
    return null
  }

  // Chrome only resolves launchWebAuthFlow at the extension's own
  // chromiumapp.org origin, but that guarantee lives in the browser — assert
  // it here too so token parsing never runs on an unexpected URL.
  if (!responseUrl.startsWith(redirectTo)) {
    console.error('[EchoFocus] OAuth: response URL origin mismatch')
    return null
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
    return null
  }

  console.log('[EchoFocus] OAuth: tokens received, calling setSession')

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (sessionError) {
    console.error('[EchoFocus] OAuth: setSession error:', sessionError)
    return null
  }

  console.log('[EchoFocus] OAuth: sign-in successful')
  return sessionData.session
}

// Product rule: one account, signed in or out on BOTH surfaces together.
// 'global' revokes every session for the user — the dashboard's included —
// and the web app's per-request getUser() notices on its next navigation.
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.auth.signOut({ scope: 'global' })
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
    await supabase.auth.signOut()
    return null
  }
  return data.session
}

const LAST_VERIFY_KEY = 'last_session_verify_at'

// The other direction of the product rule: a dashboard sign-out revokes this
// session server-side, but the stateless JWT keeps working locally until it
// expires. Ask the auth server (which checks revocation) on popup opens,
// throttled; a revoked session signs out locally, which flips every open
// page via storage.onChanged and stops the sync chain at once. Network
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
    await supabase.auth.signOut({ scope: 'local' })
  }
}
