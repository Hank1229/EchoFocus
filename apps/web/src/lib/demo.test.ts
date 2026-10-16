import { describe, expect, it } from 'vitest'
import { demoHref, isDemoPath } from './demo'

describe('demoHref', () => {
  it('sends every dashboard link to its /demo page', () => {
    expect(demoHref('/dashboard/today')).toBe('/demo')
    expect(demoHref('/dashboard')).toBe('/demo')
    expect(demoHref('/dashboard/trends')).toBe('/demo/trends')
    expect(demoHref('/dashboard/guide')).toBe('/demo/guide')
    expect(demoHref('/dashboard/settings')).toBe('/demo/settings')
    expect(demoHref('/dashboard/settings?tab=categories')).toBe('/demo/settings?tab=categories')
    expect(demoHref('/dashboard/today?date=2026-09-17')).toBe('/demo?date=2026-09-17')
  })

  it('leaves public pages alone', () => {
    for (const href of ['/', '/privacy', '/terms', '/login', 'https://github.com/Hank1229/EchoFocus', '#']) {
      expect(demoHref(href)).toBe(href)
    }
  })
})

describe('isDemoPath', () => {
  it('matches /demo and below only', () => {
    expect(isDemoPath('/demo')).toBe(true)
    expect(isDemoPath('/demo/settings')).toBe(true)
    expect(isDemoPath('/demonstration')).toBe(false)
    expect(isDemoPath('/dashboard/today')).toBe(false)
  })
})
