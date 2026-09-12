import React from 'react'
import { palette } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface FocusScoreRingProps {
  score: number  // 0-100
  size?: number
}

// The score arc repeated outward, shorter and fainter each time — the echo the
// product is named for. Offsets are added to the progress radius.
const ECHOES = [
  { gap: 7, sweep: 0.78, opacity: 0.3, width: 1.5 },
  { gap: 12.5, sweep: 0.52, opacity: 0.14, width: 1 },
]

export default function FocusScoreRing({ score, size = 104 }: FocusScoreRingProps) {
  const { t } = useLocale()
  const strokeWidth = 7
  const center = size / 2
  const radius = center - 14
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
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${t.popup.focusScore}: ${score}`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          {ECHOES.map(echo => {
            const r = radius + echo.gap
            const c = 2 * Math.PI * r
            return (
              <circle
                key={echo.gap}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={tier.accent}
                strokeWidth={echo.width}
                strokeLinecap="round"
                strokeOpacity={echo.opacity}
                strokeDasharray={c}
                strokeDashoffset={c - (score / 100) * echo.sweep * c}
              />
            )
          })}

          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={tier.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-[32px] font-semibold leading-none tabular-nums text-slate-100">
            {score}
          </span>
        </div>
      </div>

      <p className="text-xs font-medium" style={{ color: tier.accent }}>{tier.label}</p>
    </div>
  )
}
