import { describe, it, expect } from 'vitest'
import { accountEmail } from './account-email'

describe('accountEmail', () => {
  it('reads the email from a stored session', () => {
    const raw = JSON.stringify({ access_token: 'a', user: { id: 'u', email: 'me@example.com' } })
    expect(accountEmail(raw)).toBe('me@example.com')
  })

  it('is null when there is no session, or it is not one', () => {
    expect(accountEmail(undefined)).toBeNull()
    expect(accountEmail('not json')).toBeNull()
    expect(accountEmail(JSON.stringify({ user: { id: 'u' } }))).toBeNull()
    expect(accountEmail(JSON.stringify({ user: { id: 'u', email: '' } }))).toBeNull()
  })
})
