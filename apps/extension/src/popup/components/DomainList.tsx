import React from 'react'
import { Coffee, Minus, Zap } from 'lucide-react'
import type { Category, TopDomain } from '@echofocus/shared'
import { categoryColors, formatDuration, palette } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface DomainListProps {
  domains: TopDomain[]
  currentDomain: string | null
  currentElapsedSeconds: number
}

// Bars use the deep chart shades; labels use the lighter text shades.
const ACCENTS: Record<Category, string> = {
  productive: palette.productive.DEFAULT,
  distraction: palette.breaks.DEFAULT,
  neutral: palette.neutral.DEFAULT,
  uncategorized: palette.neutral.deep,
}

function categoryIcon(category: Category, color: string) {
  const props = { size: 13, strokeWidth: 2, style: { color }, className: 'flex-shrink-0' } as const
  if (category === 'productive') return <Zap {...props} />
  if (category === 'distraction') return <Coffee {...props} />
  return <Minus {...props} />
}

export default function DomainList({ domains, currentDomain, currentElapsedSeconds }: DomainListProps) {
  const { t } = useLocale()

  const labels: Record<Category, string> = {
    productive: t.categories.categoryLabels.productive,
    distraction: t.categories.categoryLabels.distraction,
    neutral: t.categories.categoryLabels.neutral,
    uncategorized: t.categories.categoryLabels.uncategorized,
  }

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
      <div className="rounded-xl border border-dashed border-slate-800 px-4 py-5 text-center">
        <p className="text-xs text-slate-400">{t.popup.noBrowsingYet}</p>
        <p className="mt-1 text-xs text-slate-600">{t.popup.keepBrowsing}</p>
      </div>
    )
  }

  const maxSeconds = Math.max(...topFive.map(d => d.seconds), 1)

  return (
    <div className="flex flex-col gap-1.5">
      {topFive.map(domain => {
        const isActive = domain.domain === currentDomain
        const accent = ACCENTS[domain.category]

        return (
          <div
            key={domain.domain}
            className={`relative overflow-hidden rounded-lg bg-slate-800/60 px-3 py-2 ${
              isActive ? 'ring-1 ring-brand/40' : ''
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 opacity-20 transition-all duration-500"
              style={{ width: `${(domain.seconds / maxSeconds) * 100}%`, backgroundColor: categoryColors[domain.category] }}
            />

            <div className="relative flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {categoryIcon(domain.category, accent)}
                <span className="truncate text-sm text-slate-200">{domain.domain}</span>
                {isActive && <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-brand" />}
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[11px]" style={{ color: accent }}>{labels[domain.category]}</span>
                <span className="text-xs font-semibold tabular-nums text-slate-300">
                  {formatDuration(domain.seconds)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
