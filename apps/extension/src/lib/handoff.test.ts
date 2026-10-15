import { describe, it, expect } from 'vitest'
import { dashboardOrigins, decideConnect, externallyConnectableMatches, isAllowedSender } from './handoff'

const PRODUCTION = 'https://echo-focus-web.vercel.app'

describe('dashboardOrigins / externallyConnectableMatches', () => {
  it('a production build lets only the production dashboard in', () => {
    expect(dashboardOrigins(PRODUCTION)).toEqual([PRODUCTION])
    expect(dashboardOrigins(undefined)).toEqual([PRODUCTION])
    expect(externallyConnectableMatches(PRODUCTION)).toEqual([`${PRODUCTION}/*`])
  })

  it('another dashboard URL adds its host with no port', () => {
    expect(externallyConnectableMatches('http://localhost:3000')).toEqual([`${PRODUCTION}/*`, 'http://localhost/*'])
    expect(externallyConnectableMatches('http://127.0.0.1:9')).toEqual([`${PRODUCTION}/*`, 'http://127.0.0.1/*'])
  })
})

describe('isAllowedSender', () => {
  const production = dashboardOrigins(PRODUCTION)

  it('accepts the dashboard on any of its pages', () => {
    expect(isAllowedSender({ url: `${PRODUCTION}/dashboard/today?date=2026-10-14` }, production)).toBe(true)
  })

  it('a production build refuses localhost', () => {
    expect(isAllowedSender({ url: 'http://localhost:3000/dashboard/today' }, production)).toBe(false)
  })

  it('a localhost build accepts any port, like the manifest match', () => {
    const local = dashboardOrigins('http://localhost:3000')
    expect(isAllowedSender({ url: 'http://localhost:3100/dev/preview/link' }, local)).toBe(true)
    expect(isAllowedSender({ url: 'https://localhost:3000/' }, local)).toBe(false)
  })

  it('refuses look-alike hosts, other schemes and a missing URL', () => {
    expect(isAllowedSender({ url: 'https://echo-focus-web.vercel.app.evil.test/' }, production)).toBe(false)
    expect(isAllowedSender({ url: 'http://echo-focus-web.vercel.app/' }, production)).toBe(false)
    expect(isAllowedSender({ url: 'chrome-extension://abc/page.html' }, production)).toBe(false)
    expect(isAllowedSender({}, production)).toBe(false)
    expect(isAllowedSender({ url: 'not a url' }, production)).toBe(false)
  })
})

describe('decideConnect', () => {
  const A = '11111111-1111-4111-8111-111111111111'
  const B = '22222222-2222-4222-8222-222222222222'
  const base = { sessionUserId: null, linkedUser: null, requestedUserId: A, busy: false }

  it.each([
    ['signed in to the same account', { sessionUserId: A }, 'already'],
    ['signed in to another account', { sessionUserId: B }, 'other-account'],
    ['a sign-in is already running', { busy: true }, 'busy'],
    ['signed out, device linked to another account', { linkedUser: B }, 'device-linked-elsewhere'],
    ['signed out, device linked to this account', { linkedUser: A }, 'proceed'],
    ['signed out, device never linked', {}, 'proceed'],
  ] as const)('%s', (_label, overrides, expected) => {
    expect(decideConnect({ ...base, ...overrides })).toBe(expected)
  })
})
