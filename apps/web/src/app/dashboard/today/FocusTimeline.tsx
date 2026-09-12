'use client'

import { useState } from 'react'
import { useLocale } from '@/lib/i18n'
import { formatDuration } from '@echofocus/shared'

interface TopDomain {
  domain: string
  seconds: number
  category: 'productive' | 'distraction' | 'neutral' | 'uncategorized'
}

interface Props {
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  topDomains: TopDomain[]
}

type HoveredSegment = 'productive' | 'distraction' | 'neutral' | null

export default function FocusTimeline({
  productiveSeconds,
  distractionSeconds,
  neutralSeconds,
  uncategorizedSeconds,
  topDomains,
}: Props) {
  const { t } = useLocale()
  const [hoveredSegment, setHoveredSegment] = useState<HoveredSegment>(null)

  const totalDay = 86400
  const prodPct = (productiveSeconds / totalDay) * 100
  const distPct = (distractionSeconds / totalDay) * 100
  const neutPct = ((neutralSeconds + uncategorizedSeconds) / totalDay) * 100

  const getTopDomains = (category: 'productive' | 'distraction' | 'neutral') => {
    const cats = category === 'neutral'
      ? ['neutral', 'uncategorized']
      : [category]
    return topDomains
      .filter(d => cats.includes(d.category))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 3)
  }

  const tooltipDomains = hoveredSegment ? getTopDomains(hoveredSegment) : []

  const segments: Array<{
    key: HoveredSegment & string
    pct: number
    bg: string
    label: string
    seconds: number
    dotColor: string
  }> = [
    { key: 'productive', pct: prodPct, bg: 'bg-emerald-500', label: t.today.productive, seconds: productiveSeconds, dotColor: 'bg-emerald-500' },
    { key: 'distraction', pct: distPct, bg: 'bg-orange-500', label: t.today.breaksAndBrowsing, seconds: distractionSeconds, dotColor: 'bg-orange-500' },
    { key: 'neutral', pct: neutPct, bg: 'bg-slate-600', label: t.today.neutral, seconds: neutralSeconds + uncategorizedSeconds, dotColor: 'bg-slate-600' },
  ]

  return (
    <div>
      {/* Bar */}
      <div className="relative h-6 rounded-full overflow-hidden flex bg-slate-800">
        {segments.map(seg => (
          <div
            key={seg.key}
            style={{ width: `${seg.pct}%` }}
            className={`${seg.bg} h-full cursor-pointer transition-opacity hover:opacity-90 flex-shrink-0`}
            onMouseEnter={() => setHoveredSegment(seg.key as HoveredSegment)}
            onMouseLeave={() => setHoveredSegment(null)}
          />
        ))}
        {/* Remaining = slate-800 (bg of parent, auto-fills) */}
      </div>

      {/* Tooltip */}
      {hoveredSegment && tooltipDomains.length > 0 && (
        <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs">
          <p className="text-slate-500 uppercase tracking-wide mb-2">{t.today.timelineTooltipDomains}</p>
          <ul className="space-y-1">
            {tooltipDomains.map(d => (
              <li key={d.domain} className="flex justify-between gap-4">
                <span className="text-slate-300 truncate">{d.domain}</span>
                <span className="text-slate-500 flex-shrink-0 tabular-nums">{formatDuration(d.seconds)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        {segments.map(seg => (
          <div key={seg.key} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${seg.dotColor}`} />
            {seg.label}
            <span className="text-slate-500 tabular-nums">{formatDuration(seg.seconds)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-slate-600" />
          {t.today.timelineUntracked}
        </div>
      </div>
    </div>
  )
}
