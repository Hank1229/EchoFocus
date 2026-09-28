// The extension keeps its own Supabase session. The page only tells it which
// way the account just went — never a token — and the extension fetches its
// own session silently. A no-op outside Chrome, without the extension, or on
// an origin the extension's manifest doesn't list (externally_connectable).
const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID ?? 'nihkocbmifcdifhhhekcllpelkfeoggl'

interface ExtensionRuntime {
  sendMessage(extensionId: string, message: unknown, respond: () => void): void
  lastError?: unknown
}

export type AccountEvent = 'signed-in' | 'signed-out'

export function tellExtension(event: AccountEvent): void {
  const runtime = (window as { chrome?: { runtime?: ExtensionRuntime } }).chrome?.runtime
  if (!runtime?.sendMessage) return
  try {
    // Reading lastError in the callback keeps "Unchecked runtime.lastError"
    // out of the console when the extension isn't installed.
    runtime.sendMessage(EXTENSION_ID, { event }, () => { void runtime.lastError })
  } catch {
    // Not installed on this browser.
  }
}
