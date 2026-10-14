import { describe, it, expect } from 'vitest'
import { checkRulePattern, normalizeRulePattern, RULE_PATTERN_MAX } from './rule-check'

describe('checkRulePattern', () => {
  it.each([
    ['exact.example.com', 'exact'],
    ['  NOTION.so ', 'exact'],
    ['*.wild.example.com', 'wildcard'],
    ['example.com/docs', 'path'],
    ['youtube.com/playlist?list=1', 'path'],
  ] as const)('accepts %s as %s', (pattern, matchType) => {
    expect(checkRulePattern(pattern, matchType)).toBeNull()
  })

  it.each([
    ['', 'exact', 'empty'],
    ['   ', 'exact', 'empty'],
    ['a'.repeat(RULE_PATTERN_MAX + 1), 'exact', 'tooLong'],
    ['bad host.com', 'exact', 'spaces'],
    ['bare.example.com', 'wildcard', 'wildcard'],      // H12: no "*." — would act as exact
    ['example.com', 'path', 'path'],
    ['pathy.example.com/blog', 'exact', 'slash'],     // H12: a host never equals this
    ['*.example.com/x', 'wildcard', 'slash'],
  ] as const)('rejects %s as %s with %s', (pattern, matchType, problem) => {
    expect(checkRulePattern(pattern, matchType)).toBe(problem)
  })

  it('allows a pattern exactly at the limit', () => {
    expect(checkRulePattern('a'.repeat(RULE_PATTERN_MAX), 'exact')).toBeNull()
  })
})

describe('normalizeRulePattern', () => {
  it('trims and lowercases', () => {
    expect(normalizeRulePattern('  GitHub.COM ')).toBe('github.com')
  })
})
