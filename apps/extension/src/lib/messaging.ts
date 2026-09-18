// The one way the popup, the options page and the onboarding page talk to the
// service worker. It used to be four near-identical copies, three of which
// collapsed "the worker said no" and "the worker never answered" into the same
// null — which is how the options page came to show a "Saved" checkmark for a
// save that never happened.

export interface MessageResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Returns null only when the message never reached the worker (it was asleep,
// the extension was reloaded mid-click). Anything else is the worker's own
// verdict, error string and all.
export async function sendMessage<T>(type: string, payload?: unknown): Promise<MessageResponse<T> | null> {
  try {
    const response = (await chrome.runtime.sendMessage({ type, payload })) as MessageResponse<T> | undefined
    return response ?? null
  } catch {
    return null
  }
}
