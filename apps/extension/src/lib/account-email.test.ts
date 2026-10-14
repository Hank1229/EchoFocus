import { describe, it, expect } from 'vitest'
import { accountEmail, accountUserId } from './account-email'

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

describe('accountUserId', () => {
  it('reads the user id from a stored session', () => {
    expect(accountUserId(JSON.stringify({ access_token: 'a', user: { id: 'u-1', email: 'me@example.com' } }))).toBe('u-1')
  })

  it('is null when there is no session, or it is not one', () => {
    expect(accountUserId(undefined)).toBeNull()
    expect(accountUserId('not json')).toBeNull()
    expect(accountUserId(JSON.stringify({ user: {} }))).toBeNull()
  })
})
