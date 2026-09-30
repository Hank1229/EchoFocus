import { describe, it, expect } from 'vitest'
import type { ClassificationRule } from '@echofocus/shared'
import { addRule } from './rule-list'

function rule(pattern: string, matchType: ClassificationRule['matchType'], category: ClassificationRule['category'], id: string): ClassificationRule {
  return { id, pattern, matchType, category, isDefault: false, createdAt: 1 }
}

describe('addRule', () => {
  it('replaces the exact rule already written for the same domain instead of piling up a second', () => {
    const existing = [rule('github.com', 'exact', 'productive', 'old'), rule('*.google.com', 'wildcard', 'neutral', 'w')]

    const updated = addRule(existing, rule('github.com', 'exact', 'distraction', 'new'))

    expect(updated.map((r) => r.id)).toEqual(['new', 'w'])
    expect(updated.filter((r) => r.pattern === 'github.com')).toHaveLength(1)
  })

  it('puts a new rule first and leaves rules for other patterns and match types alone', () => {
    const existing = [rule('github.com', 'wildcard', 'productive', 'w'), rule('gitlab.com', 'exact', 'productive', 'g')]

    const updated = addRule(existing, rule('github.com', 'exact', 'distraction', 'new'))

    expect(updated.map((r) => r.id)).toEqual(['new', 'w', 'g'])
  })
})
