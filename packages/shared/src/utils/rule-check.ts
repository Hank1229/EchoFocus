import type { MatchType } from '../types/rules'

// The longest pattern an editor accepts. Shared by the Dashboard rules editor
// and the extension's Options form and import, so a rule never passes one
// surface and fails the other.
export const RULE_PATTERN_MAX = 120

// Why a pattern cannot be saved for its match type. The matcher (categorize.ts)
// compares hostnames for exact/wildcard rules and needs "*." for wildcard
// matching to reach subdomains; a path rule's host half must match the hostname
// exactly and its path half must exist. A pattern that contradicts its match
// type would be stored and then silently never fire, or match less than its
// label promises.
export type RulePatternProblem = 'empty' | 'tooLong' | 'spaces' | 'wildcard' | 'path' | 'slash'

export function normalizeRulePattern(pattern: string): string {
  return pattern.trim().toLowerCase()
}

export function checkRulePattern(pattern: string, matchType: MatchType): RulePatternProblem | null {
  const normalized = normalizeRulePattern(pattern)
  if (!normalized) return 'empty'
  if (normalized.length > RULE_PATTERN_MAX) return 'tooLong'
  if (/\s/.test(normalized)) return 'spaces'
  if (matchType === 'wildcard' && !normalized.startsWith('*.')) return 'wildcard'
  if (matchType === 'path' && !normalized.includes('/')) return 'path'
  if (matchType !== 'path' && normalized.includes('/')) return 'slash'
  return null
}
