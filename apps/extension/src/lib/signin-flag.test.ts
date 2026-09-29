import { describe, it, expect } from 'vitest'
import { isSignInPending, SIGN_IN_FLAG_TTL_MS } from './signin-flag'

describe('isSignInPending', () => {
  const now = 1_790_000_000_000

  it('a flow started moments ago keeps the popup on "connecting"', () => {
    expect(isSignInPending(now - 1_000, now)).toBe(true)
  })

  // A worker killed mid-flow never reaches its finally; without an age limit
  // the popup would hide its sign-in button for good.
  it('a flag older than the time limit gives the button back', () => {
    expect(isSignInPending(now - SIGN_IN_FLAG_TTL_MS, now)).toBe(false)
    expect(isSignInPending(now - SIGN_IN_FLAG_TTL_MS - 1, now)).toBe(false)
  })

  it('the old boolean flag and a missing flag never count as linking', () => {
    expect(isSignInPending(true, now)).toBe(false)
    expect(isSignInPending(undefined, now)).toBe(false)
  })
})
