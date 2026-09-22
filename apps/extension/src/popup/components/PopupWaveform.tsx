import React from 'react'

interface Props {
  /** 24 local-hour buckets of productive seconds. */
  hours: number[]
  /** Accessible summary, e.g. "Focus by hour". */
  label: string
}

const BAR_MAX = 34
const BAR_EMPTY = 2

// 24-hour mini distribution bar. Communicates one thing only — which hours
// held focus today — so no peaks, glows, or entrance motion.
export default function PopupWaveform({ hours, label }: Props) {
  const peak = Math.max(...hours, 1)

  return (
    <div role="img" aria-label={label}>
      <div className="flex h-10 items-end gap-[2px]">
        {hours.map((seconds, hour) => (
          <span
            key={hour}
            title={`${String(hour).padStart(2, '0')}:00 — ${Math.round(seconds / 60)} min`}
            className="min-w-0 flex-1 rounded-sm"
            style={{
              height: seconds > 0 ? Math.max((seconds / peak) * BAR_MAX, 4) : BAR_EMPTY,
              background: seconds > 0 ? 'var(--productive)' : 'var(--border)',
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-caption text-content-tertiary">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}
