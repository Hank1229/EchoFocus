import React from 'react'

// The focus arc from the popup, repeated outward — shorter and fainter with
// every ring. Used once, as the hero of the welcome step.
const RINGS = [
  { radius: 26, width: 6, sweep: 0.74, opacity: 1 },
  { radius: 38, width: 2.5, sweep: 0.62, opacity: 0.55 },
  { radius: 50, width: 1.5, sweep: 0.48, opacity: 0.3 },
  { radius: 62, width: 1.25, sweep: 0.34, opacity: 0.16 },
  { radius: 74, width: 1, sweep: 0.2, opacity: 0.08 },
]

export default function EchoMark({ size = 168, className = '' }: { size?: number; className?: string }) {
  const center = 84

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 168 168"
      className={className}
      aria-hidden="true"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {RINGS.map(ring => {
        const circumference = 2 * Math.PI * ring.radius
        return (
          <circle
            key={ring.radius}
            cx={center}
            cy={center}
            r={ring.radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={ring.width}
            strokeLinecap="round"
            strokeOpacity={ring.opacity}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ring.sweep)}
          />
        )
      })}
      <circle cx={center} cy={center} r={3.5} fill="var(--accent)" />
    </svg>
  )
}
