// signin_in_progress holds the time a worker-run OAuth flow started. The flow
// lives in that worker's memory, so the flag can outlive it (worker killed
// mid-flow); past this age it no longer means "linking" and the popup offers
// its button again. Long enough to type a password and pass 2-step checks.
export const SIGN_IN_FLAG_TTL_MS = 5 * 60_000

export function isSignInPending(flag: unknown, now = Date.now()): boolean {
  return typeof flag === 'number' && now - flag < SIGN_IN_FLAG_TTL_MS
}
