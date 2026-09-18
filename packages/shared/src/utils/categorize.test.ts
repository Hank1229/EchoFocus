import { describe, it, expect } from 'vitest'
import { extractDomain, categorizeDomain, categorizeUrl } from './categorize'
import type { ClassificationRule } from '../types/rules'

describe('extractDomain', () => {
  it('strips protocol and www', () => {
    expect(extractDomain('https://www.github.com/user/repo')).toBe('github.com')
    expect(extractDomain('github.com')).toBe('github.com')
  })

  it('returns empty string for non-web inputs', () => {
    expect(extractDomain('')).toBe('')
    expect(extractDomain('newtab')).toBe('')
    expect(extractDomain('chrome://extensions')).toBe('')
    expect(extractDomain('chrome-extension://abc123/popup.html')).toBe('')
  })
})

describe('categorizeDomain', () => {
  it('matches an exact default domain', () => {
    expect(categorizeDomain('github.com')).toBe('productive')
    expect(categorizeDomain('youtube.com')).toBe('distraction')
  })

  it('falls back to the base domain for a subdomain', () => {
    expect(categorizeDomain('docs.github.com')).toBe('productive')
  })

  it('returns uncategorized for an unknown domain', () => {
    expect(categorizeDomain('some-random-site.xyz')).toBe('uncategorized')
  })

  it('lets a custom exact rule override the default', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: 'github.com', matchType: 'exact', category: 'distraction', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeDomain('github.com', rules)).toBe('distraction')
  })

  it('matches a wildcard custom rule against any subdomain', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: '*.notion.so', matchType: 'wildcard', category: 'productive', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeDomain('team.notion.so', rules)).toBe('productive')
    expect(categorizeDomain('notion.so', rules)).toBe('productive')
  })
})

describe('categorizeUrl', () => {
  it('matches a path-based custom rule', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: 'youtube.com/playlist', matchType: 'path', category: 'productive', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeUrl('https://youtube.com/playlist?list=123', rules)).toBe('productive')
  })

  it('falls back to domain categorization when no path rule matches', () => {
    expect(categorizeUrl('https://youtube.com/watch?v=abc')).toBe('distraction')
  })

  it('ignores the scheme and the query string when matching the path prefix', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: 'youtube.com/playlist', matchType: 'path', category: 'productive', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeUrl('https://www.youtube.com/playlist', rules)).toBe('productive')
    expect(categorizeUrl('http://youtube.com/playlist?list=x&t=2', rules)).toBe('productive')
    expect(categorizeUrl('https://youtube.com/playlists-of-mine', rules)).toBe('productive')
    expect(categorizeUrl('https://youtube.com/watch?v=abc', rules)).toBe('distraction')
  })

  it('is case insensitive on both host and path', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: 'youtube.com/playlist', matchType: 'path', category: 'productive', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeUrl('https://YouTube.COM/PlayList?list=X', rules)).toBe('productive')
  })

  it('does not let a bare-substring pattern classify every site', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: 'com', matchType: 'path', category: 'productive', isDefault: false, createdAt: 0 },
      { id: '2', pattern: 's/', matchType: 'path', category: 'productive', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeUrl('https://youtube.com/watch?v=abc', rules)).toBe('distraction')
    expect(categorizeUrl('https://facebook.com/feed', rules)).toBe('distraction')
  })

  it('does not match the pattern inside the scheme or the host', () => {
    const rules: ClassificationRule[] = [
      // "https" appears in every URL's scheme; "tube.com/watch" is a host suffix
      { id: '1', pattern: 'https', matchType: 'path', category: 'neutral', isDefault: false, createdAt: 0 },
      { id: '2', pattern: 'tube.com/watch', matchType: 'path', category: 'neutral', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeUrl('https://youtube.com/watch?v=abc', rules)).toBe('distraction')
  })

  it('matches the host exactly, so a subdomain is not covered by its parent', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: 'github.com/foo', matchType: 'path', category: 'distraction', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeUrl('https://github.com/foo/bar', rules)).toBe('distraction')
    expect(categorizeUrl('https://gist.github.com/foo/bar', rules)).toBe('productive')
  })

  it('does not throw on a URL with no scheme or a malformed one', () => {
    const rules: ClassificationRule[] = [
      { id: '1', pattern: 'github.com/foo', matchType: 'path', category: 'distraction', isDefault: false, createdAt: 0 },
    ]
    expect(categorizeUrl('github.com/foo/bar', rules)).toBe('distraction')
    expect(categorizeUrl('h ttp://%%%', rules)).toBe('uncategorized')
  })
})
