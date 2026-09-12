import React from 'react'
import { Flame, RotateCcw } from 'lucide-react'
import { palette } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface StreakChipProps {
  current: number
  best: number
}

export default function StreakChip({ current, best }: StreakChipProps) {
  const { t } = useLocale()

  // Nothing running: only nudge someone who had a streak worth rebuilding.
  if (current === 0) {
    if (best < 2) return null
    return (
      <p className="flex items-center gap-1.5 px-1 text-xs text-slate-500">
        <RotateCcw size={12} strokeWidth={1.75} className="flex-shrink-0" />
        {t.popup.streakRestart}
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-1">
      <Flame size={13} strokeWidth={2} style={{ color: palette.productive.DEFAULT }} className="flex-shrink-0" />
      <span className="text-xs text-slate-400">{t.popup.streakDays.replace('{n}', String(current))}</span>
      {best > current && (
        <span className="ml-auto text-xs tabular-nums text-slate-600">
          {t.popup.streakBest.replace('{n}', String(best))}
        </span>
      )}
    </div>
  )
}
