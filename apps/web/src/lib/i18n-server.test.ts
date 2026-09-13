import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { cookies } from 'next/headers'
import en from '../locales/en.json'
import zhTW from '../locales/zh-TW.json'
import { getLocale } from './i18n-server'

function withCookie(value: string | undefined): void {
  const store = {
    get: (name: string) =>
      name === 'echofocus-lang' && value !== undefined ? { name, value } : undefined,
  }
  vi.mocked(cookies).mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('getLocale', () => {
  it('defaults to English when no language cookie is set', async () => {
    withCookie(undefined)
    const { language, t } = await getLocale()
    expect(language).toBe('en')
    expect(t).toBe(en)
  })

  it('resolves the zh-TW cookie to the Traditional Chinese locale', async () => {
    withCookie('zh-TW')
    const { language, t } = await getLocale()
    expect(language).toBe('zh-TW')
    expect(t).toBe(zhTW)
    expect(t.common.signIn).toBe('登入')
  })

  it('falls back to English for an unsupported language code', async () => {
    withCookie('fr')
    const { language, t } = await getLocale()
    expect(language).toBe('en')
    expect(t.common.signIn).toBe('Sign In')
  })

  it('falls back to English for an empty cookie value', async () => {
    withCookie('')
    expect((await getLocale()).language).toBe('en')
  })

  it('is case sensitive — "zh-tw" is not a supported code', async () => {
    withCookie('zh-tw')
    expect((await getLocale()).language).toBe('en')
  })
})
