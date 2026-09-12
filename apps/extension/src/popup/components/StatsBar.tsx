import React from 'react'
import { Coffee, Minus, Zap } from 'lucide-react'
import { categoryColors, formatDuration, palette } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface StatsProps {
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
      <span className="whitespace-nowrap text-xs font-semibold tabular-nums" style={{ color: accent }}>
        {formatDuration(seconds)}
      </span>
    </div>
  )
}

// The day's headline: total time plus how it split, sized to sit beside the ring.
export function StatsSummary({
  productiveSeconds,
  distractionSeconds,
  neutralSeconds,
  uncategorizedSeconds,
  totalSeconds,
}: StatsProps) {
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
      <div>
        <p className="text-xs text-slate-500">{t.popup.todaysTotal}</p>
        <p className="mt-1 font-display text-[26px] font-semibold leading-none tabular-nums text-slate-100">
          {formatDuration(totalSeconds)}
        </p>
      </div>

      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
        {segments.map(segment => (
          <div key={segment.key} style={{ width: `${segment.pct}%`, backgroundColor: segment.fill }} />
        ))}
      </div>
    </div>
  )
}

export function CategoryRows({
  productiveSeconds,
  distractionSeconds,
  neutralSeconds,
  uncategorizedSeconds,
}: Omit<StatsProps, 'totalSeconds'>) {
  const { t } = useLocale()

  return (
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
        seconds={neutralSeconds + uncategorizedSeconds}
        accent={palette.neutral.DEFAULT}
        icon={<Minus size={13} strokeWidth={2} style={{ color: palette.neutral.DEFAULT }} className="flex-shrink-0" />}
      />
    </div>
  )
}
