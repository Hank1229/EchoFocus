// The day as a waveform — the echo motif drawn with real data. One bar per
// local hour, height carrying that hour's productive minutes; an hour with
// nothing stays a resting dot, so a day reads like a recording: silence,
// then signal. Server-rendered; the entrance sweep is pure CSS.

interface Props {
  /** 24 local-hour buckets of productive seconds. */
  hours: number[]
  /** Accessible summary, e.g. "Focus by hour". */
  label: string
}

const BAR_MAX = 44
const BAR_MIN = 5

export default function DayWaveform({ hours, label }: Props) {
  const peak = Math.max(...hours, 1)
  const peakIndex = hours.indexOf(Math.max(...hours))
  const hasSignal = hours.some(h => h > 0)

  return (
    <div role="img" aria-label={label}>
      <div className="flex h-[44px] items-end">
        {hours.map((seconds, hour) => {
          const height = seconds > 0 ? Math.max((seconds / peak) * BAR_MAX, 8) : BAR_MIN
          const isPeak = hasSignal && hour === peakIndex && seconds > 0
          return (
            // Each hour owns an equal cell; the bar inside stays needle-thin
            // so height — the signal — is what the eye reads. Silent hours
            // rest as dots on the baseline.
            <span key={hour} className="flex min-w-0 flex-1 items-end justify-center">
              <span
                title={`${String(hour).padStart(2, '0')}:00 — ${Math.round(seconds / 60)} min`}
                className={`wave-grow w-[5px] rounded-full ${
                  seconds > 0
                    ? isPeak
                      ? 'bg-brand-soft shadow-[0_0_12px_rgba(94,234,212,0.45)]'
                      : 'bg-brand/80'
                    : 'bg-slate-700'
                }`}
                style={{ height, animationDelay: `${hour * 22}ms` }}
              />
            </span>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[0.625rem] tabular-nums text-slate-600">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}
