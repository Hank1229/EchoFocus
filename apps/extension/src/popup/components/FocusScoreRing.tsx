import React from 'react'
import { palette } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface FocusScoreRingProps {
  score: number  // 0-100
  size?: number
}

export default function FocusScoreRing({ score, size = 96 }: FocusScoreRingProps) {
  const { t } = useLocale()
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  // Teal is the only brand color, so the tier is encoded by shade, not by hue.
  const tier = score >= 70
    ? { accent: palette.brand.soft, label: t.popup.excellent }
    : score >= 40
      ? { accent: palette.brand.DEFAULT, label: t.popup.average }
      : { accent: palette.brand.deep, label: t.popup.roomToGrow }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tier.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none tabular-nums text-slate-100">{score}</span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{t.popup.pts}</span>
        </div>
      </div>

      <p className="text-xs font-semibold" style={{ color: tier.accent }}>{tier.label}</p>
    </div>
  )
}
