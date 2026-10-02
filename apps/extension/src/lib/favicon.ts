import { z } from 'zod'
import { MAX_URL_LENGTH, FAVICON_CACHE_KEY } from '../background/storage'

export { FAVICON_CACHE_KEY }

// The popup's site icons come from Chrome's own favicon cache (the _favicon
// endpoint), which is keyed by the pages Chrome actually loaded. Three rules
// keep the icon right and steady:
//   - the site's root page comes first, so a page with its own icon (a
//     claude.ai artifact, a workspace page, a mail tab showing an unread
//     count) never stands in for the site;
//   - when the cache has nothing for a candidate, Chrome answers with the same
//     grey globe every time, so a candidate that matches that globe is a miss;
//   - the first real icon found for a domain is kept for the rest of the day.

// Stored domains have "www." stripped, but sites like youtube.com load their
// root at www. The visited URL is today's FIRST one for the domain, so it
// cannot change as the day goes on. A URL at the storage clamp was cut short
// and can never match a cached page, so it is not worth a lookup.
export function faviconCandidates(domain: string, visitedUrl: string | null): string[] {
  const candidates = [`https://${domain}/`, `https://www.${domain}/`]
  if (visitedUrl && visitedUrl.length < MAX_URL_LENGTH && !candidates.includes(visitedUrl)) {
    candidates.push(visitedUrl)
  }
  return candidates
}

export function firstVisitedUrls(entries: { domain: string; url: string }[]): Record<string, string> {
  const first: Record<string, string> = {}
  for (const entry of entries) {
    if (entry.url && !(entry.domain in first)) first[entry.domain] = entry.url
  }
  return first
}

// Walks the candidates in order and returns the first image that is not the
// miss globe. Null means "could not tell": no candidate had a real icon, or
// reading the pixels failed — the caller then shows the first candidate as is.
export async function resolveIcon(
  candidates: string[],
  load: (pageUrl: string) => Promise<string>,
  missGlobe: string | null,
): Promise<string | null> {
  if (missGlobe === null) return null
  try {
    for (const pageUrl of candidates) {
      const image = await load(pageUrl)
      if (image !== missGlobe) return image
    }
  } catch {
    return null
  }
  return null
}

// One day's icons, as data URLs, for the domains the popup has shown. Local
// storage only: no sync or upload path reads this key, and a new day starts
// from an empty cache.
const faviconCacheSchema = z.object({
  date: z.string(),
  icons: z.record(z.string(), z.string().startsWith('data:image/')),
})

export type FaviconCache = z.infer<typeof faviconCacheSchema>

export function todaysIcons(stored: unknown, today: string): Record<string, string> {
  const parsed = faviconCacheSchema.safeParse(stored)
  return parsed.success && parsed.data.date === today ? parsed.data.icons : {}
}

export function withIcon(stored: unknown, today: string, domain: string, icon: string): FaviconCache {
  return { date: today, icons: { ...todaysIcons(stored, today), [domain]: icon } }
}
