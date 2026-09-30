import type { ClassificationRule } from '@echofocus/shared'

// New rules go first so they win over older ones. An exact rule replaces the
// exact rule already written for the same pattern instead of stacking a
// second one behind it that can never match.
export function addRule(rules: ClassificationRule[], rule: ClassificationRule): ClassificationRule[] {
  const rest = rule.matchType === 'exact'
    ? rules.filter((r) => !(r.matchType === 'exact' && r.pattern === rule.pattern))
    : rules
  return [rule, ...rest]
}
