// The dashboard asks the extension two things over externally_connectable:
// whether it is signed in, and to sign in with the browser's current Google
// account. Everything here is pure so the rules can be tested without Chrome.

export const PRODUCTION_DASHBOARD_ORIGIN = 'https://echo-focus-web.vercel.app'

// Origins the dashboard may talk from, written as scheme://host with no port:
// a Chrome match pattern ignores the port when it names none, and the sender
// check below must agree with the manifest. A build pointed at another
// dashboard (localhost, the test build's 127.0.0.1) adds that host; the
// production build stays production-only.
export function dashboardOrigins(dashboardUrl: string | undefined): string[] {
  const origins = [PRODUCTION_DASHBOARD_ORIGIN]
  if (!dashboardUrl) return origins
  const url = new URL(dashboardUrl)
  const origin = `${url.protocol}//${url.hostname}`
  if (!origins.includes(origin)) origins.push(origin)
  return origins
}

export function externallyConnectableMatches(dashboardUrl: string | undefined): string[] {
  return dashboardOrigins(dashboardUrl).map(origin => `${origin}/*`)
}

export function isAllowedSender(sender: { url?: string }, allowedOrigins: string[]): boolean {
  if (!sender.url) return false
  let url: URL
  try {
    url = new URL(sender.url)
  } catch {
    return false
  }
  return allowedOrigins.includes(`${url.protocol}//${url.hostname}`)
}

export type ConnectDecision = 'already' | 'other-account' | 'device-linked-elsewhere' | 'busy' | 'proceed'

// device-linked-elsewhere: this device's history was uploaded to another
// account before. A sign-in started from a web page would quietly upload the
// whole local archive to the new one, so that switch is left to the Options
// page, where the user starts it themselves.
export function decideConnect(input: {
  sessionUserId: string | null
  linkedUser: string | null
  requestedUserId: string
  busy: boolean
}): ConnectDecision {
  const { sessionUserId, linkedUser, requestedUserId, busy } = input
  if (sessionUserId === requestedUserId) return 'already'
  if (sessionUserId) return 'other-account'
  if (busy) return 'busy'
  if (linkedUser && linkedUser !== requestedUserId) return 'device-linked-elsewhere'
  return 'proceed'
}
