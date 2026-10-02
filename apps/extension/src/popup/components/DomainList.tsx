import React, { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import type { TopDomain } from '@echofocus/shared'
import { formatDuration, getTodayDateString } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'
import { categoriesLink } from '../../lib/options-link'
import { trackingEntryArraySchema } from '../../lib/schemas'
import { FAVICON_CACHE_KEY, faviconCandidates, firstVisitedUrls, resolveIcon, todaysIcons, withIcon, type FaviconCache } from '../../lib/favicon'
import { isDarkIcon } from '../../lib/icon-tone'
import CategoryDot from './CategoryDot'

interface DomainListProps {
  domains: TopDomain[]
  currentDomain: string | null
  currentElapsedSeconds: number
}

function faviconSrc(pageUrl: string): string {
  const src = new URL(chrome.runtime.getURL('/_favicon/'))
  src.searchParams.set('pageUrl', pageUrl)
  src.searchParams.set('size', '32')
  return src.toString()
}

// Chrome's answer for one page, as a data URL: comparable with the miss globe
// and storable for the rest of the day. Rejects when the pixels can't be read.
function loadAsDataUrl(pageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) throw new Error('No 2D context')
        context.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Favicon did not load'))
    img.src = faviconSrc(pageUrl)
  })
}

// .invalid can never resolve, so Chrome's answer for it is the miss globe.
let missGlobe: Promise<string | null> | null = null
function getMissGlobe(): Promise<string | null> {
  missGlobe ??= loadAsDataUrl('https://echofocus-favicon-probe.invalid/').catch(() => null)
  return missGlobe
}

// One image source per listed domain. Only the domains this list shows are
// resolved and cached; anything that fails falls back to Chrome's own answer
// for the site's root, never to an error or an empty slot.
function useFaviconSources(domains: string[]): Record<string, string> | null {
  const [sources, setSources] = useState<Record<string, string> | null>(null)
  const listKey = domains.join('|')

  useEffect(() => {
    let cancelled = false
    const resolveAll = async () => {
      const today = getTodayDateString()
      const resolved: Record<string, string> = {}
      try {
        const entriesKey = `entries:${today}`
        const stored = await chrome.storage.local.get([entriesKey, FAVICON_CACHE_KEY])
        const entries = trackingEntryArraySchema.safeParse(stored[entriesKey] ?? [])
        const visited = firstVisitedUrls(entries.success ? entries.data : [])
        const before: unknown = stored[FAVICON_CACHE_KEY]
        // Starting from today's icons alone is what clears a previous day.
        let cache: FaviconCache = { date: today, icons: todaysIcons(before, today) }
        let changed = before !== undefined && Object.keys(cache.icons).length === 0
        const globe = await getMissGlobe()
        for (const domain of domains) {
          const cached = cache.icons[domain]
          if (cached) {
            resolved[domain] = cached
            continue
          }
          const candidates = faviconCandidates(domain, visited[domain] ?? null)
          const icon = await resolveIcon(candidates, loadAsDataUrl, globe)
          if (icon) {
            resolved[domain] = icon
            cache = withIcon(cache, today, domain, icon)
            changed = true
          } else {
            resolved[domain] = faviconSrc(candidates[0])
          }
        }
        if (changed) await chrome.storage.local.set({ [FAVICON_CACHE_KEY]: cache })
      } catch (err) {
        console.warn('[EchoFocus] Favicon lookup fell back to the site root:', err)
      }
      for (const domain of domains) resolved[domain] ??= faviconSrc(`https://${domain}/`)
      if (!cancelled) setSources(resolved)
    }
    void resolveAll()
    return () => { cancelled = true }
  }, [listKey])

  return sources
}

// Any failure reading the pixels means "not dark": no chip, nothing thrown.
function readsDark(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')
    if (!context || canvas.width === 0) return false
    context.drawImage(img, 0, 0)
    return isDarkIcon(context.getImageData(0, 0, canvas.width, canvas.height).data)
  } catch {
    return false
  }
}

// A site missing from Chrome's cache shows Chrome's grey globe; only an image
// that fails to load at all falls back to ours.
function Favicon({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  const [dark, setDark] = useState(false)
  // The slot is held at 16px while the icons resolve, so nothing shifts.
  if (src === null) return <span aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
  if (failed) {
    return <Globe size={16} strokeWidth={1.5} aria-hidden="true" className="flex-shrink-0 text-content-tertiary" />
  }
  return (
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      data-dark-icon={dark || undefined}
      className="favicon h-4 w-4 flex-shrink-0"
      onLoad={e => setDark(readsDark(e.currentTarget))}
      onError={() => setFailed(true)}
    />
  )
}

// Today's top 5 — each row opens that domain's category in Options. The row
// never opens the site itself.
export default function DomainList({ domains, currentDomain, currentElapsedSeconds }: DomainListProps) {
  const { t } = useLocale()

  // The current session is not yet in the stored aggregate — fold it in.
  const merged = [...domains]
  if (currentDomain && currentElapsedSeconds > 0) {
    const idx = merged.findIndex(d => d.domain === currentDomain)
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], seconds: merged[idx].seconds + currentElapsedSeconds }
      merged.sort((a, b) => b.seconds - a.seconds)
    }
  }

  const topFive = merged.slice(0, 5)
  const faviconSources = useFaviconSources(topFive.map(d => d.domain))

  if (topFive.length === 0) {
    return (
      <div className="rounded-lg border border-line px-4 py-5 text-center">
        <p className="text-caption text-content-secondary">{t.popup.noBrowsingYet}</p>
        <p className="mt-1 text-caption text-content-tertiary">{t.popup.keepBrowsing}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {topFive.map(domain => (
        <button
          key={domain.domain}
          type="button"
          onClick={() => void chrome.tabs.create({ url: categoriesLink(domain.domain) })}
          // -mx-2/px-2: the hover fill reaches past the text column while the
          // favicons stay on the section's left edge.
          className="pressable group relative -mx-2 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <Favicon src={faviconSources && faviconSources[domain.domain]} />
          <CategoryDot category={domain.category} />
          <span className="min-w-0 flex-1 truncate text-body text-content">{domain.domain}</span>
          <span className="flex-shrink-0 text-caption text-content-tertiary">
            {formatDuration(domain.seconds)}
          </span>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-2 z-10 mb-1 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-caption text-content-secondary opacity-0 shadow-[var(--shadow-float)] [transition:opacity_var(--dur-base)_var(--ease)] group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {t.categories.categoryLabels[domain.category]} · {t.popup.recategorizeHint}
          </span>
        </button>
      ))}
    </div>
  )
}
