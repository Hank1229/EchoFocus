// EchoFocus — send-email-report: SHELVED
//
// The email-report feature is deliberately parked until a verified sending
// domain exists. The previous deployment was live with no rate limit, so any
// signed-in user could loop it and burn the Resend quota. This stub locks the
// endpoint; the real implementation is preserved in index.parked.ts and
// returns with its own quota table when the feature does.

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: HEADERS })
  }
  return new Response(
    JSON.stringify({ error: 'Email reports are not available yet.' }),
    { status: 503, headers: HEADERS },
  )
})
