import React from 'react'
import { Coffee, Minus, Zap } from 'lucide-react'
import { categoryColors, formatDuration, palette } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface StatsBarProps {
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  totalSeconds: number
}

interface StatRowProps {
  label: string
  seconds: number
  accent: string
  icon: React.ReactNode
}

function StatRow({ label, seconds, accent, icon }: StatRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        {icon}
        <span className="truncate text-xs text-slate-400">{label}</span>
      </span>
      <span className="text-xs font-semibold tabular-nums" style={{ color: accent }}>
        {formatDuration(seconds)}
      </span>
    </div>
  )
}

export default function StatsBar({
  productiveSeconds,
  distractionSeconds,
  neutralSeconds,
  uncategorizedSeconds,
  totalSeconds,
}: StatsBarProps) {
  const { t } = useLocale()

  const otherSeconds = neutralSeconds + uncategorizedSeconds
  const total = Math.max(totalSeconds, 1)
  const segments = [
    { key: 'productive', pct: (productiveSeconds / total) * 100, fill: categoryColors.productive },
    { key: 'breaks', pct: (distractionSeconds / total) * 100, fill: categoryColors.distraction },
    { key: 'neutral', pct: (otherSeconds / total) * 100, fill: categoryColors.neutral },
  ].filter(segment => segment.pct > 0)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{t.popup.todaysTotal}</span>
        <span className="text-lg font-bold leading-none tabular-nums text-slate-100">
          {formatDuration(totalSeconds)}
        </span>
      </div>

      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
        {segments.map(segment => (
          <div
            key={segment.key}
            className="transition-all duration-500"
            style={{ width: `${segment.pct}%`, backgroundColor: segment.fill }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <StatRow
          label={t.categories.categoryLabels.productive}
          seconds={productiveSeconds}
          accent={palette.productive.DEFAULT}
          icon={<Zap size={13} strokeWidth={2} style={{ color: palette.productive.DEFAULT }} className="flex-shrink-0" />}
        />
        <StatRow
          label={t.categories.categoryLabels.distraction}
          seconds={distractionSeconds}
          accent={palette.breaks.DEFAULT}
          icon={<Coffee size={13} strokeWidth={2} style={{ color: palette.breaks.DEFAULT }} className="flex-shrink-0" />}
        />
        <StatRow
          label={t.categories.categoryLabels.neutral}
          seconds={otherSeconds}
          accent={palette.neutral.DEFAULT}
          icon={<Minus size={13} strokeWidth={2} style={{ color: palette.neutral.DEFAULT }} className="flex-shrink-0" />}
        />
      </div>
    </div>
  )
}
