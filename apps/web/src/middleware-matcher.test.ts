import { describe, expect, it } from 'vitest'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { config } from '../middleware'

const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url })

describe('middleware matcher', () => {
  it('skips the public demo', () => {
    for (const url of ['/demo', '/demo/', '/demo/trends', '/demo/settings?tab=account', '/demo/guide']) {
      expect(runs(url), url).toBe(false)
    }
  })

  it('still runs on the dashboard, login and paths that only start with "demo"', () => {
    for (const url of ['/dashboard/today', '/login', '/', '/dev/preview', '/demonstration', '/dashboard/demo']) {
      expect(runs(url), url).toBe(true)
    }
  })
})
