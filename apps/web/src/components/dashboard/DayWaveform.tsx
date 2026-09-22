// The day's 24-hour distribution — Today's hero chart. One bar per local
// hour, height carrying that hour's productive minutes; silent hours rest as
// dots on the baseline. Communicates one thing only, so no peaks, glows, or
// entrance motion.

interface Props {
  /** 24 local-hour buckets of productive seconds. */
  hours: number[]
  /** Accessible summary, e.g. "Focus by hour". */
  label: string
}

const BAR_MAX = 44
const BAR_MIN = 4

export default function DayWaveform({ hours, label }: Props) {
  const peak = Math.max(...hours, 1)

  return (
    <div role="img" aria-label={label}>
      <div className="flex h-[44px] items-end">
        {hours.map((seconds, hour) => (
          <span key={hour} className="flex min-w-0 flex-1 items-end justify-center">
            <span
              title={`${String(hour).padStart(2, '0')}:00 — ${Math.round(seconds / 60)} min`}
              className="w-[4px] rounded-full"
              style={{
                height: seconds > 0 ? Math.max((seconds / peak) * BAR_MAX, 7) : BAR_MIN,
                background: seconds > 0 ? 'var(--accent)' : 'var(--border)',
              }}
            />
          </span>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-caption text-content-tertiary">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}
