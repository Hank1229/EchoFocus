import type { Category } from './tracking'

export type MatchType = 'exact' | 'wildcard' | 'path'

export interface ClassificationRule {
  id: string
  pattern: string    // e.g. "github.com", "*.google.com", "youtube.com/playlist"
  matchType: MatchType
  category: Category
  isDefault: boolean // true = built-in, false = user-created
  createdAt: number  // Unix timestamp ms
}
