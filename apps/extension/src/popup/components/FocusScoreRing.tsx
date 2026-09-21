import React, { useEffect, useState } from 'react'
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

  // The arc draws itself in on open: first paint at empty, next frame at the
  // score, and the CSS .arc-draw transition sweeps between them. Reduced
  // motion never leaves the initial-render-at-target path.
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDrawn(true)
      return
    }
    const frame = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const offset = drawn
    ? circumference - (score / 100) * circumference
    : circumference

  // High scores should feel like a reward: green for great days, teal for
  // steady ones, muted slate when there's room to grow. Never red.
  const tier = score >= 70
    ? { accent: palette.productive.DEFAULT, label: t.popup.excellent }
    : score >= 40
      ? { accent: palette.brand.DEFAULT, label: t.popup.average }
      : { accent: palette.neutral.DEFAULT, label: t.popup.roomToGrow }

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
            stroke="#1b2622"
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
            className="arc-draw"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          {/* mt compensates Bricolage's high cap-height so the numeral sits on the optical center */}
          <span
            className="mt-[3px] font-display text-[32px] font-semibold leading-none tabular-nums"
            style={{ color: tier.accent }}
          >
            {score}
          </span>
        </div>
      </div>

      <p className="text-xs font-medium text-slate-500">{tier.label}</p>
    </div>
  )
}
