'use client'

import { useEffect, useRef, useState } from 'react'
import { scoreColorVar } from './score'

const TALLY_MS = 700

// The sanctioned score tally (DESIGN.md section 5): numeral and arc settle
// onto the score together, from zero on first view and from the currently
// shown value on date navigation — searchParams changes re-render this SAME
// mounted instance, so the start point must be what is on screen, not zero.
// Reduced motion renders the final value directly.
function useTally(target: number): number {
  const [value, setValue] = useState(target)
  const shown = useRef<number | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current = target
      setValue(target)
      return
    }

    const from = shown.current ?? 0
    if (from === target) return

    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / TALLY_MS, 1)
      // easeOutQuint — sprints, then settles like a meter coming to rest.
      const eased = 1 - Math.pow(1 - progress, 5)
      const next = from + (target - from) * eased
      shown.current = next
      setValue(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setValue(from)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

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
  const shown = useTally(score)
  // Tier color follows the TARGET, not the in-flight value — the ring must
  // not flash through lower tiers on its way up.
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
          strokeDashoffset={circumference - (shown / 100) * circumference}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-hero" style={{ color }}>{Math.round(shown)}</span>
        <span className="text-caption text-content-tertiary">{label}</span>
      </div>
    </div>
  )
}
