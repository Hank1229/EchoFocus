import React from 'react'
import type { Category, TopDomain } from '@echofocus/shared'
import { formatDuration } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface DomainListProps {
  domains: TopDomain[]
  currentDomain: string | null
  currentElapsedSeconds: number
}

const DOTS: Record<Category, string> = {
  productive: 'var(--productive)',
  distraction: 'var(--rest)',
  neutral: 'var(--neutral)',
  uncategorized: 'var(--neutral)',
}

// Today's top 5 — single-line rows: category dot, domain, duration.
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
        <div
          key={domain.domain}
          className="pressable flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover"
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ background: DOTS[domain.category] }}
          />
          <span className="min-w-0 flex-1 truncate text-body text-content">{domain.domain}</span>
          <span className="flex-shrink-0 text-caption text-content-tertiary">
            {formatDuration(domain.seconds)}
          </span>
        </div>
      ))}
    </div>
  )
}
