import type { ClassificationRule } from '@echofocus/shared'
import { classificationRuleArraySchema } from '../lib/schemas'

const ruleSchema = classificationRuleArraySchema.element

// A crafted file shouldn't be able to push custom_rules toward the 5 MB
// storage quota, or slow every classification down with a huge pattern.
const MAX_IMPORTED_RULES = 500
const MAX_PATTERN_LENGTH = 200

export interface MergedRules {
  rules: ClassificationRule[]
  added: number
  skipped: number
}

// `raw` is JSON parsed from a file the user picked, so nothing about it is
// trusted: the top level must be an array, and every entry is validated on its
// own so one malformed rule can't sink the rest of the import.
// Returns null when the file isn't a rules array at all.
export function mergeImportedRules(existing: ClassificationRule[], raw: unknown): MergedRules | null {
  if (!Array.isArray(raw)) return null

  const seen = new Set(existing.map(rule => identity({ ...rule, pattern: normalize(rule.pattern) })))
  const rules = [...existing]
  let added = 0
  let skipped = 0

  for (const item of raw) {
    if (added >= MAX_IMPORTED_RULES) {
      skipped++
      continue
    }

    const parsed = ruleSchema.safeParse(item)
    if (!parsed.success) {
      skipped++
      continue
    }

    const pattern = normalize(parsed.data.pattern)
    const key = identity({ ...parsed.data, pattern })
    if (!pattern || pattern.length > MAX_PATTERN_LENGTH || seen.has(key)) {
      skipped++
      continue
    }

    seen.add(key)
    // Fresh id so an imported rule can never collide with an existing one;
    // isDefault is forced off because anything imported is a user rule.
    rules.push({ ...parsed.data, pattern, id: crypto.randomUUID(), isDefault: false })
    added++
  }

  return { rules, added, skipped }
}

function identity(rule: ClassificationRule): string {
  return `${rule.pattern}|${rule.matchType}`
}

function normalize(pattern: string): string {
  return pattern.trim().toLowerCase()
}
