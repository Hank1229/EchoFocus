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

  let responseUrl: string
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

  console.log('[EchoFocus] OAuth: responseUrl =', responseUrl)

  const url = new URL(responseUrl)

  // Implicit flow: tokens are in the hash fragment (#access_token=...&refresh_token=...)
  const hashParams = new URLSearchParams(url.hash.slice(1))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  console.log('[EchoFocus] OAuth: hash keys =', [...hashParams.keys()])
  console.log('[EchoFocus] OAuth: query keys =', [...url.searchParams.keys()])

  if (!accessToken || !refreshToken) {
    // Log the full fragment/query to help diagnose what Supabase actually returned
    console.error('[EchoFocus] OAuth: missing tokens. hash =', url.hash, 'search =', url.search)
    console.error('[EchoFocus] OAuth: This usually means flowType is not "implicit".',
      'Check supabase.ts — flowType must be set to "implicit".')
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

  console.log('[EchoFocus] OAuth: signed in as', sessionData.session?.user?.email)
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
