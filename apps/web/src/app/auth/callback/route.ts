import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only an absolute path of our own. `origin` carries no trailing slash, so a
  // next of "@evil.com" would concatenate into https://our.host@evil.com —
  // userinfo, not a path, and the browser lands on evil.com.
  const requested = searchParams.get('next')
  const next = requested?.startsWith('/') && !requested.startsWith('//')
    ? requested
    : '/dashboard/today'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[EchoFocus] Auth callback error:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
