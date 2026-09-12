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

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  return data.session
}
