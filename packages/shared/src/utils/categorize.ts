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
    // A trailing dot ("github.com.") is a valid absolute-DNS hostname that
    // resolves identically to "github.com" — without stripping it, it escapes
    // DEFAULT_CATEGORIES and every custom rule as an unrecognized domain.
    return hostname.replace(/^www\./, '').replace(/\.$/, '')
  } catch {
    return ''
  }
}

// Check if a domain matches a classification rule.
// Defensive against malformed rules from storage — a bad rule must never
// throw and break tracking; it simply doesn't match.
function matchesRule(domain: string, rule: ClassificationRule): boolean {
  if (typeof rule?.pattern !== 'string') return false
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

// A path rule reads "host/path-prefix". The host half is matched EXACTLY
// (leading www. stripped from both sides), the same semantic as an 'exact'
// domain rule, and the path half is a prefix of pathname+search — so
// "youtube.com/playlist" still catches "/playlist?list=123" while
// "github.com/foo" never catches gist.github.com.
//
// This used to be url.includes(pattern) against the raw URL, which matched
// inside the scheme and the host: a pattern of "com" or "s/" classified every
// site on the internet, and path rules are checked before everything else.
function matchesPathRule(url: string, pattern: string): boolean {
  const slash = pattern.indexOf('/')
  // No slash means no path half — the pattern is a bare host, so it can only
  // match that exact host rather than any URL containing the text.
  const patternHost = (slash === -1 ? pattern : pattern.slice(0, slash))
    .replace(/^www\./, '')
    .replace(/\.$/, '')
  const patternPath = slash === -1 ? '' : pattern.slice(slash)

  let parsed: URL
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    return false
  }

  // Same normalization extractDomain applies (www. and trailing-dot strip),
  // so the two rule families can never disagree about what host a URL is on.
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
  if (host !== patternHost) return false
  return `${parsed.pathname}${parsed.search}`.toLowerCase().startsWith(patternPath)
}

// Categorize by full URL (handles path-based rules)
export function categorizeUrl(
  url: string,
  customRules: ClassificationRule[] = [],
): Category {
  if (!url) return 'uncategorized'

  // Path rules win over domain rules — the more specific rule should beat the
  // general one, whichever order the user happened to create them in.
  for (const rule of customRules) {
    if (rule.matchType !== 'path' || typeof rule.pattern !== 'string') continue
    if (matchesPathRule(url, rule.pattern.toLowerCase())) return rule.category
  }

  // Fall back to domain-based categorization
  const domain = extractDomain(url)
  return categorizeDomain(domain, customRules.filter(r => r.matchType !== 'path'))
}
