// Talks to the EchoFocus extension over externally_connectable. The page only
// learns whether the extension is signed in and to which account relative to
// this one; the extension never sends tokens or tracking data back.

export type LinkStatus = 'not-installed' | 'unlinked' | 'linked' | 'other-account'

export type ConnectResult =
  | 'linked'
  | 'other-account'
  | 'device-linked-elsewhere'
  | 'busy'
  | 'mismatch'
  | 'failed'

interface Runtime {
  sendMessage(extensionId: string, message: unknown, callback: (response: unknown) => void): void
  lastError?: unknown
}

export const STATUS_TIMEOUT_MS = 1500
// A connect may open Google's window and wait for the user to pick an
// account; past the extension's own sign-in window it counts as failed.
export const CONNECT_TIMEOUT_MS = 5 * 60_000

export function extensionIds(raw: string | undefined = process.env.NEXT_PUBLIC_EXTENSION_IDS): string[] {
  return (raw ?? '').split(',').map(id => id.trim()).filter(Boolean)
}

// chrome.runtime exists on a page only when an installed extension lists the
// page's origin under externally_connectable.
function runtime(): Runtime | undefined {
  return (globalThis as { chrome?: { runtime?: Runtime } }).chrome?.runtime
}

// Resolves null on a timeout, an unknown or disabled ID (lastError), or a
// throw. Reading lastError inside the callback keeps Chrome from logging
// "Unchecked runtime.lastError" to the console.
function send(rt: Runtime, extensionId: string, message: unknown, timeoutMs: number): Promise<unknown> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    try {
      rt.sendMessage(extensionId, message, response => {
        clearTimeout(timer)
        resolve(rt.lastError ? null : response ?? null)
      })
    } catch {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function statusFrom(reply: unknown): LinkStatus | null {
  if (!isRecord(reply) || reply.ok !== true || typeof reply.signedIn !== 'boolean') return null
  if (!reply.signedIn) return 'unlinked'
  return reply.sameAccount === true ? 'linked' : 'other-account'
}

export type Detection = { status: 'not-installed' } | { status: Exclude<LinkStatus, 'not-installed'>; extensionId: string }

// Every configured ID is asked at once; the first one to answer is the
// extension this page talks to from then on.
export function detectExtension(userId: string, ids = extensionIds()): Promise<Detection> {
  const rt = runtime()
  if (!rt || ids.length === 0) return Promise.resolve({ status: 'not-installed' })
  const message = { v: 1, type: 'ECHOFOCUS_STATUS', userId }
  return new Promise(resolve => {
    let pending = ids.length
    for (const extensionId of ids) {
      void send(rt, extensionId, message, STATUS_TIMEOUT_MS).then(reply => {
        const status = statusFrom(reply)
        if (status) resolve({ status, extensionId })
        else if (--pending === 0) resolve({ status: 'not-installed' })
      })
    }
  })
}

// The extension's refusal reasons, as the card's states. 'already' means the
// extension was signed in to this account by the time the click landed.
const CONNECT_REASONS = new Map<string, ConnectResult>([
  ['already', 'linked'],
  ['other-account', 'other-account'],
  ['device-linked-elsewhere', 'device-linked-elsewhere'],
  ['busy', 'busy'],
  ['mismatch', 'mismatch'],
])

export async function connectExtension(extensionId: string, userId: string, email: string): Promise<ConnectResult> {
  const rt = runtime()
  if (!rt) return 'failed'
  const reply = await send(rt, extensionId, { v: 1, type: 'ECHOFOCUS_CONNECT', userId, email }, CONNECT_TIMEOUT_MS)
  if (!isRecord(reply)) return 'failed'
  if (reply.ok === true) return 'linked'
  return (typeof reply.reason === 'string' && CONNECT_REASONS.get(reply.reason)) || 'failed'
}
