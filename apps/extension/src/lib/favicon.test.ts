import { describe, it, expect } from 'vitest'
import { faviconCandidates, firstVisitedUrls, resolveIcon, todaysIcons, withIcon } from './favicon'
import { MAX_URL_LENGTH } from '../background/storage'

const GLOBE = 'data:image/png;base64,GLOBE'

describe('faviconCandidates', () => {
  it("puts the site's root first even when today's visit was a page with its own icon", () => {
    const candidates = faviconCandidates('claude.ai', 'https://claude.ai/artifact/abc')
    expect(candidates[0]).toBe('https://claude.ai/')
    expect(candidates).toEqual(['https://claude.ai/', 'https://www.claude.ai/', 'https://claude.ai/artifact/abc'])
  })

  it('skips a visited URL cut short at the storage clamp — it can never match', () => {
    const clamped = 'https://www.google.com/search?q=' + 'x'.repeat(MAX_URL_LENGTH)
    expect(faviconCandidates('google.com', clamped.slice(0, MAX_URL_LENGTH))).toEqual(['https://google.com/', 'https://www.google.com/'])
  })

  it('does not repeat a visited URL that is already a root candidate', () => {
    expect(faviconCandidates('youtube.com', 'https://www.youtube.com/')).toEqual(['https://youtube.com/', 'https://www.youtube.com/'])
  })
})

describe('firstVisitedUrls', () => {
  it("keeps the day's first URL per domain, so later visits cannot swap the icon", () => {
    const entries = [
      { domain: 'claude.ai', url: 'https://claude.ai/new' },
      { domain: 'github.com', url: 'https://github.com/' },
      { domain: 'claude.ai', url: 'https://claude.ai/artifact/abc' },
    ]
    expect(firstVisitedUrls(entries)).toEqual({ 'claude.ai': 'https://claude.ai/new', 'github.com': 'https://github.com/' })
  })
})

describe('resolveIcon', () => {
  const loader = (images: Record<string, string>) => async (pageUrl: string) => images[pageUrl] ?? GLOBE

  it('takes the root icon even when a later candidate also has one', async () => {
    const icon = await resolveIcon(
      ['https://claude.ai/', 'https://www.claude.ai/', 'https://claude.ai/artifact/abc'],
      loader({ 'https://claude.ai/': 'data:image/png;base64,CLAUDE', 'https://claude.ai/artifact/abc': 'data:image/png;base64,ARTIFACT' }),
      GLOBE,
    )
    expect(icon).toBe('data:image/png;base64,CLAUDE')
  })

  it('moves past a miss to the next candidate', async () => {
    const icon = await resolveIcon(['https://youtube.com/', 'https://www.youtube.com/'], loader({ 'https://www.youtube.com/': 'data:image/png;base64,YT' }), GLOBE)
    expect(icon).toBe('data:image/png;base64,YT')
  })

  it('answers null when every candidate misses, when pixels cannot be read, or without a globe to compare', async () => {
    expect(await resolveIcon(['https://a.test/'], loader({}), GLOBE)).toBeNull()
    expect(await resolveIcon(['https://a.test/'], async () => { throw new Error('tainted') }, GLOBE)).toBeNull()
    expect(await resolveIcon(['https://a.test/'], loader({ 'https://a.test/': 'data:image/png;base64,A' }), null)).toBeNull()
  })
})

describe('favicon day cache', () => {
  it("keeps today's icons and adds new ones", () => {
    const stored = withIcon(undefined, '2026-10-01', 'github.com', 'data:image/png;base64,GH')
    const next = withIcon(stored, '2026-10-01', 'claude.ai', 'data:image/png;base64,CL')
    expect(todaysIcons(next, '2026-10-01')).toEqual({ 'github.com': 'data:image/png;base64,GH', 'claude.ai': 'data:image/png;base64,CL' })
  })

  it("drops yesterday's icons on a new day", () => {
    const yesterday = withIcon(undefined, '2026-09-30', 'github.com', 'data:image/png;base64,GH')
    expect(todaysIcons(yesterday, '2026-10-01')).toEqual({})
    expect(withIcon(yesterday, '2026-10-01', 'claude.ai', 'data:image/png;base64,CL')).toEqual({ date: '2026-10-01', icons: { 'claude.ai': 'data:image/png;base64,CL' } })
  })

  it('ignores anything that is not a cache of image data URLs', () => {
    expect(todaysIcons({ date: '2026-10-01', icons: { 'github.com': 'javascript:alert(1)' } }, '2026-10-01')).toEqual({})
    expect(todaysIcons('garbage', '2026-10-01')).toEqual({})
  })
})
