import React, { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import type { TopDomain } from '@echofocus/shared'
import { formatDuration, getTodayDateString } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'
import { categoriesLink } from '../../lib/options-link'
import { trackingEntryArraySchema } from '../../lib/schemas'
import CategoryDot from './CategoryDot'

interface DomainListProps {
  domains: TopDomain[]
  currentDomain: string | null
  currentElapsedSeconds: number
}

// Chrome keys its favicon cache by the pages it actually loaded, while a
// stored domain has "www." stripped — looking up youtube.com misses an icon
// cached for www.youtube.com. So look each icon up by a URL the user really
// visited today; today's entries never leave this device.
function useVisitedUrls(): Record<string, string> | null {
  const [urls, setUrls] = useState<Record<string, string> | null>(null)
  useEffect(() => {
    const read = async () => {
      const key = `entries:${getTodayDateString()}`
      const latest: Record<string, string> = {}
      try {
        const parsed = trackingEntryArraySchema.safeParse((await chrome.storage.local.get(key))[key] ?? [])
        if (parsed.success) for (const entry of parsed.data) if (entry.url) latest[entry.domain] = entry.url
      } catch (err) {
        // Icons fall back to the bare domain; the list itself is unaffected.
        console.warn('[EchoFocus] Could not read today\'s entries for favicons:', err)
      }
      setUrls(latest)
    }
    void read()
  }, [])
  return urls
}

// Chrome's own favicon cache through the _favicon endpoint: read on this
// device, no request leaves the browser. A site missing from the cache comes
// back as Chrome's grey globe; only a failed load falls back to ours.
function Favicon({ pageUrl }: { pageUrl: string | null }) {
  const [failed, setFailed] = useState(false)
  // The slot is held at 16px while today's URLs load, so nothing shifts.
  if (pageUrl === null) return <span aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
  if (failed) {
    return <Globe size={16} strokeWidth={1.5} aria-hidden="true" className="flex-shrink-0 text-content-tertiary" />
  }
  const src = new URL(chrome.runtime.getURL('/_favicon/'))
  src.searchParams.set('pageUrl', pageUrl)
  src.searchParams.set('size', '32')
  return (
    <img src={src.toString()} alt="" width={16} height={16} className="h-4 w-4 flex-shrink-0" onError={() => setFailed(true)} />
  )
}

// Today's top 5 — each row opens that domain's category in Options. The row
// never opens the site itself.
export default function DomainList({ domains, currentDomain, currentElapsedSeconds }: DomainListProps) {
  const { t } = useLocale()
  const visitedUrls = useVisitedUrls()

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
          <Favicon pageUrl={visitedUrls && (visitedUrls[domain.domain] ?? `https://${domain.domain}/`)} />
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
