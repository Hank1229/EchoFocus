import type { Category } from '../types/tracking'
import type { ClassificationRule } from '../types/rules'
import { DEFAULT_CATEGORIES } from '../constants/categories'

// Extract root domain from a full URL or hostname.
// Strips protocol, www., and path.
// e.g. "https://www.github.com/user/repo" → "github.com"
export function extractDomain(input: string): string {
  if (!input || input === 'newtab' || input.startsWith('chrome://') || input.startsWith('chrome-extension://')) {
    return ''
  }
  try {
    // Add protocol if missing so URL parsing works
    const withProtocol = input.startsWith('http') ? input : `https://${input}`
    const { hostname } = new URL(withProtocol)
    return hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Check if a domain matches a classification rule.
function matchesRule(domain: string, rule: ClassificationRule): boolean {
  const pattern = rule.pattern.toLowerCase()
  const lowerDomain = domain.toLowerCase()

  switch (rule.matchType) {
    case 'exact':
      return lowerDomain === pattern || lowerDomain === pattern.replace(/^www\./, '')

    case 'wildcard': {
      // *.google.com matches any subdomain of google.com
      if (pattern.startsWith('*.')) {
        const base = pattern.slice(2)
        return lowerDomain === base || lowerDomain.endsWith(`.${base}`)
      }
      // Fallback: treat as exact
      return lowerDomain === pattern
    }

    case 'path':
      // Pattern like "youtube.com/playlist" — we only have domain here,
      // so path rules need the full URL. For domain-only matching, skip.
      return false

    default:
      return false
  }
}

// Categorize a domain, checking custom rules first then defaults.
export function categorizeDomain(
  domain: string,
  customRules: ClassificationRule[] = [],
): Category {
  if (!domain) return 'uncategorized'

  const lower = domain.toLowerCase().replace(/^www\./, '')

  // 1. Check custom user rules first (higher priority)
  for (const rule of customRules) {
    if (matchesRule(lower, rule)) return rule.category
  }

  // 2. Exact match in defaults
  if (lower in DEFAULT_CATEGORIES) {
    return DEFAULT_CATEGORIES[lower]
  }

  // 3. Subdomain match: try progressively shorter base domains
  // e.g. "docs.github.com" → check "github.com"
  const parts = lower.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const baseDomain = parts.slice(i).join('.')
    if (baseDomain in DEFAULT_CATEGORIES) {
      return DEFAULT_CATEGORIES[baseDomain]
    }
  }

  return 'uncategorized'
}

// Categorize by full URL (handles path-based rules)
export function categorizeUrl(
  url: string,
  customRules: ClassificationRule[] = [],
): Category {
  if (!url) return 'uncategorized'

  // Check path-based custom rules first
  const lowerUrl = url.toLowerCase()
  for (const rule of customRules) {
    if (rule.matchType === 'path') {
      const pattern = rule.pattern.toLowerCase()
      if (lowerUrl.includes(pattern)) return rule.category
    }
  }

  // Fall back to domain-based categorization
  const domain = extractDomain(url)
  return categorizeDomain(domain, customRules.filter(r => r.matchType !== 'path'))
}
