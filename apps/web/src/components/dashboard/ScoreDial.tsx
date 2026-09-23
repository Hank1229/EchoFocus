'use client'

import { scoreColorVar } from './score'

interface Props {
  score: number
  /** Caption inside the ring, under the numeral (e.g. "Focus score"). */
  label: string
  size?: number
}

// The score ring — the product's shared visual anchor, mirroring the popup's
// idle module. Progress and numeral both follow the score's tier color.
export default function ScoreDial({ score, label, size = 148 }: Props) {
  const strokeWidth = 8
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  const color = scoreColorVar(score)

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${score}`}
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
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (score / 100) * circumference}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-hero" style={{ color }}>{score}</span>
        <span className="text-caption text-content-tertiary">{label}</span>
      </div>
    </div>
  )
}
