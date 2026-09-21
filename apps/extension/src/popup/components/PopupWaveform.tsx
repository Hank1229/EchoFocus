import React from 'react'

// The day as a waveform, popup-sized — the same echo motif the dashboard's
// verdict band carries, so the two surfaces read as one product. One bar per
// local hour of productive time; silent hours rest as dots.

interface Props {
  /** 24 local-hour buckets of productive seconds. */
  hours: number[]
  /** Accessible summary, e.g. "Focus by hour". */
  label: string
}

const BAR_MAX = 26
const BAR_MIN = 3

export default function PopupWaveform({ hours, label }: Props) {
  const peak = Math.max(...hours, 1)
  const peakIndex = hours.indexOf(Math.max(...hours))
  const hasSignal = hours.some(h => h > 0)

  return (
    <div role="img" aria-label={label}>
      <div className="flex h-[26px] items-end">
        {hours.map((seconds, hour) => {
          const height = seconds > 0 ? Math.max((seconds / peak) * BAR_MAX, 5) : BAR_MIN
          const isPeak = hasSignal && hour === peakIndex && seconds > 0
          return (
            <span key={hour} className="flex min-w-0 flex-1 items-end justify-center">
              <span
                title={`${String(hour).padStart(2, '0')}:00 — ${Math.round(seconds / 60)} min`}
                className={`wave-grow w-[3px] rounded-full ${
                  seconds > 0
                    ? isPeak
                      ? 'bg-brand-soft shadow-[0_0_8px_rgba(94,234,212,0.4)]'
                      : 'bg-brand/80'
                    : 'bg-slate-700'
                }`}
                style={{ height, animationDelay: `${hour * 15}ms` }}
              />
            </span>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[9px] tabular-nums text-slate-600">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}
