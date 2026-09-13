import { describe, it, expect } from 'vitest'
import type { ClassificationRule } from '@echofocus/shared'
import { mergeImportedRules } from './rules-import'

function rule(overrides: Partial<ClassificationRule> = {}): ClassificationRule {
  return {
    id: 'existing-1',
    pattern: 'github.com',
    matchType: 'exact',
    category: 'productive',
    isDefault: false,
    createdAt: 1_770_000_000_000,
    ...overrides,
  }
}

describe('rejecting a file that is not a rules array', () => {
  it.each([
    ['an object', { rules: [rule()] }],
    ['a string', '[]'],
    ['null', null],
    ['a number', 42],
  ])('returns null for %s', (_label, raw) => {
    expect(mergeImportedRules([], raw)).toBeNull()
  })

  it('accepts an empty array as a valid, empty import', () => {
    expect(mergeImportedRules([], [])).toEqual({ rules: [], added: 0, skipped: 0 })
  })
})

describe('per-rule validation', () => {
  it('imports a well-formed rule', () => {
    const merged = mergeImportedRules([], [rule({ pattern: 'notion.so' })])

    expect(merged?.added).toBe(1)
    expect(merged?.skipped).toBe(0)
    expect(merged?.rules).toHaveLength(1)
    expect(merged?.rules[0]).toMatchObject({
      pattern: 'notion.so',
      matchType: 'exact',
      category: 'productive',
      isDefault: false,
    })
  })

  it('skips the bad entries and keeps the good ones', () => {
    const merged = mergeImportedRules([], [
      rule({ pattern: 'notion.so' }),
      { pattern: 'linear.app' },                                  // missing fields
      rule({ pattern: 'figma.com', matchType: 'regex' as never }), // unknown match type
      rule({ pattern: 'x.com', category: 'fun' as never }),        // unknown category
      rule({ pattern: '' }),                                       // empty pattern
      rule({ pattern: '   ' }),                                    // whitespace-only pattern
      'not-a-rule',
      null,
      rule({ pattern: 'arxiv.org' }),
    ])

    expect(merged?.added).toBe(2)
    expect(merged?.skipped).toBe(7)
    expect(merged?.rules.map(r => r.pattern)).toEqual(['notion.so', 'arxiv.org'])
  })

  it('normalizes the pattern to trimmed lowercase', () => {
    const merged = mergeImportedRules([], [rule({ pattern: '  GitHub.COM  ' })])

    expect(merged?.rules[0].pattern).toBe('github.com')
  })

  it('forces isDefault off so an import can never masquerade as built-in', () => {
    const merged = mergeImportedRules([], [rule({ pattern: 'youtube.com', isDefault: true })])

    expect(merged?.rules[0].isDefault).toBe(false)
  })

  it('issues a fresh id per imported rule so ids stay unique', () => {
    const existing = [rule({ id: 'shared-id' })]
    const merged = mergeImportedRules(existing, [
      rule({ id: 'shared-id', pattern: 'notion.so' }),
      rule({ id: 'shared-id', pattern: 'linear.app' }),
    ])

    const ids = merged?.rules.map(r => r.id) ?? []
    expect(new Set(ids).size).toBe(3)
    expect(ids[0]).toBe('shared-id')
  })
})

describe('de-duplication on pattern + match type', () => {
  it('skips a rule the user already has', () => {
    const merged = mergeImportedRules([rule()], [rule({ id: 'imported', pattern: 'github.com' })])

    expect(merged?.added).toBe(0)
    expect(merged?.skipped).toBe(1)
    expect(merged?.rules).toHaveLength(1)
  })

  it('skips a duplicate even when the imported category differs', () => {
    const merged = mergeImportedRules([rule()], [rule({ pattern: 'github.com', category: 'distraction' })])

    expect(merged?.added).toBe(0)
    expect(merged?.rules[0].category).toBe('productive')
  })

  it('treats the same pattern with a different match type as a new rule', () => {
    const merged = mergeImportedRules([rule()], [rule({ pattern: 'github.com', matchType: 'wildcard' })])

    expect(merged?.added).toBe(1)
    expect(merged?.rules.map(r => r.matchType)).toEqual(['exact', 'wildcard'])
  })

  it('de-duplicates against the normalized existing pattern', () => {
    const merged = mergeImportedRules([rule({ pattern: 'github.com' })], [rule({ pattern: 'GITHUB.COM ' })])

    expect(merged?.added).toBe(0)
    expect(merged?.skipped).toBe(1)
  })

  it('de-duplicates repeats inside the imported file itself', () => {
    const merged = mergeImportedRules([], [
      rule({ pattern: 'notion.so' }),
      rule({ pattern: 'notion.so' }),
      rule({ pattern: 'notion.so', matchType: 'path' }),
    ])

    expect(merged?.added).toBe(2)
    expect(merged?.skipped).toBe(1)
  })

  it('appends to the existing list without reordering or dropping it', () => {
    const existing = [rule({ id: 'a', pattern: 'github.com' }), rule({ id: 'b', pattern: 'figma.com' })]
    const merged = mergeImportedRules(existing, [rule({ pattern: 'linear.app' })])

    expect(merged?.rules.map(r => r.pattern)).toEqual(['github.com', 'figma.com', 'linear.app'])
    expect(existing).toHaveLength(2)
  })
})
