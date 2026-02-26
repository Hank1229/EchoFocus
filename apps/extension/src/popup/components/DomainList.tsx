import React from 'react'
import type { TopDomain } from '@echofocus/shared'
import { formatDuration } from '@echofocus/shared'
import { Zap, Coffee, Minus } from 'lucide-react'

interface DomainListProps {
  domains: TopDomain[]
  currentDomain: string | null
  currentElapsedSeconds: number
}

function categoryDot(category: TopDomain['category']): string {
  switch (category) {
    case 'productive': return '#22c55e'
    case 'distraction': return '#f97316'
    case 'neutral': return '#64748b'
    default: return '#475569'
  }
}

function categoryIcon(category: TopDomain['category']): React.ReactNode {
  switch (category) {
    case 'productive': return <Zap size={12} strokeWidth={1.75} className="text-emerald-400 flex-shrink-0" />
    case 'distraction': return <Coffee size={12} strokeWidth={1.75} className="text-orange-400 flex-shrink-0" />
    case 'neutral': return <Minus size={12} strokeWidth={1.75} className="text-slate-400 flex-shrink-0" />
    default: return <Minus size={12} strokeWidth={1.75} className="text-slate-500 flex-shrink-0" />
  }
}

function categoryLabel(category: TopDomain['category']): string {
  switch (category) {
    case 'productive': return 'Productive'
    case 'distraction': return 'Breaks & Browsing'
    case 'neutral': return 'Neutral'
    default: return 'Uncategorized'
  }
}

export default function DomainList({ domains, currentDomain, currentElapsedSeconds }: DomainListProps) {
  // Merge current session into displayed domains
  const displayDomains = [...domains]
  if (currentDomain && currentElapsedSeconds > 0) {
    const idx = displayDomains.findIndex(d => d.domain === currentDomain)
    if (idx >= 0) {
      displayDomains[idx] = {
        ...displayDomains[idx],
        seconds: displayDomains[idx].seconds + currentElapsedSeconds,
      }
    }
    // Sort again after merging
    displayDomains.sort((a, b) => b.seconds - a.seconds)
  }

  const topFive = displayDomains.slice(0, 5)

  if (topFive.length === 0) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-xs text-slate-500">No browsing activity recorded yet</p>
        <p className="text-xs text-slate-600 mt-1">Keep browsing — stats will appear here</p>
      </div>
    )
  }

  const maxSeconds = Math.max(...topFive.map(d => d.seconds), 1)

  return (
    <div className="space-y-1.5">
      {topFive.map((domain) => {
        const barWidth = (domain.seconds / maxSeconds) * 100
        const isActive = domain.domain === currentDomain
        const dot = categoryDot(domain.category)
        const icon = categoryIcon(domain.category)
        const label = categoryLabel(domain.category)

        return (
          <div
            key={domain.domain}
            className={`relative px-3 py-2 rounded-lg overflow-hidden transition-all ${
              isActive ? 'ring-1 ring-slate-600' : ''
            }`}
            style={{ background: '#1e293b' }}
          >
            {/* Background bar */}
            <div
              className="absolute left-0 top-0 bottom-0 opacity-20 rounded-lg transition-all duration-500"
              style={{ width: `${barWidth}%`, backgroundColor: dot }}
            />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {icon}
                <span className="text-sm text-slate-200 truncate max-w-[160px]">
                  {domain.domain}
                </span>
                {isActive && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-slate-500" style={{ color: dot }}>{label}</span>
                <span className="text-xs font-semibold text-slate-300 tabular-nums">
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
