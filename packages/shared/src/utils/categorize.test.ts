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
})
