import React from 'react'
import { useLocale } from '../../lib/i18n'

interface FocusScoreRingProps {
  score: number  // 0-100
  size?: number
}

// The idle module's hero: score numeral inside a quiet progress ring. The
// ring color follows the score — productive green when the day earned it,
// accent for steady, tertiary when there's room to grow.
export default function FocusScoreRing({ score, size = 104 }: FocusScoreRingProps) {
  const { t } = useLocale()
  const strokeWidth = 7
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius

  // Low tier stays on --text-secondary, not tertiary: a 40px numeral is
  // essential content and tertiary fails contrast on the light theme.
  const stroke = score >= 70 ? 'var(--productive)' : score >= 40 ? 'var(--accent)' : 'var(--text-secondary)'

  return (
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
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (score / 100) * circumference}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-hero" style={{ color: stroke }}>{score}</span>
      </div>
    </div>
  )
}
