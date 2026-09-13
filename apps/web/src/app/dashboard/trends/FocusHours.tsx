import { formatDuration } from '@echofocus/shared'
import type { Locale } from '@/lib/i18n-server'

interface Props {
  /** Productive seconds per local hour, summed over the period. 24 entries. */
  hours: number[]
  days: number
  copy: Locale['trends']
}

// Six steps: an untouched hour reads as slate, then five emerald grades of the
// peak hour. Written out so Tailwind sees every class it has to emit.
const TONES = [
  'bg-neutral/10',
  'bg-productive/20',
  'bg-productive/35',
  'bg-productive/55',
  'bg-productive/75',
  'bg-productive',
]

function tone(seconds: number, peak: number): string {
  if (seconds <= 0) return TONES[0]
  return TONES[Math.min(5, Math.ceil((seconds / peak) * 5))]
}

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

// A single heat strip rather than a day × hour matrix: the question is "when am
// I at my best", which is a 24-value shape, and one row stays legible at 30 days
// and on a phone. Hand-built in CSS grid — recharts has no cell mark, and a
// grid of divs wraps and prints its own labels for free.
export default function FocusHours({ hours, days, copy }: Props) {
  const peak = Math.max(...hours)
  const peakHour = hours.indexOf(peak)

  const ranked = hours
    .map((seconds, hour) => ({ hour, seconds }))
    .filter(h => h.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)

  return (
    <section className="border-t border-slate-800/80 pt-9">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-semibold tracking-tight text-slate-100">
          {copy.focusHours}
        </h2>
        {ranked.length > 0 && (
          <p className="text-xs tabular-nums text-slate-600">
            {copy.focusHoursTop}: {ranked.slice(0, 3).map(h => hourLabel(h.hour)).join(' · ')}
          </p>
        )}
      </div>

      {peak === 0 ? (
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-500">
          {copy.focusHoursEmpty}
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-xl text-sm leading-relaxed tabular-nums text-slate-400">
            {copy.focusHoursPeak
              .replace('{hour}', hourLabel(peakHour))
              .replace('{duration}', formatDuration(peak))
              .replace('{days}', String(days))}
          </p>

          <ul
            className="mt-6 grid gap-1"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(1.75rem, 1fr))' }}
          >
            {hours.map((seconds, hour) => {
              const label = copy.focusHoursCell
                .replace('{hour}', hourLabel(hour))
                .replace('{duration}', formatDuration(seconds))
              return (
                <li key={hour} className="flex flex-col items-center gap-1.5">
                  <span
                    aria-hidden
                    title={label}
                    className={`h-9 w-full rounded-sm ${tone(seconds, peak)} ${
                      hour === peakHour ? 'ring-1 ring-productive ring-offset-1 ring-offset-slate-950' : ''
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`text-[10px] tabular-nums ${
                      hour === peakHour ? 'text-productive' : 'text-slate-600'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}
                  </span>
                  <span className="sr-only">{label}</span>
                </li>
              )
            })}
          </ul>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-600">
            <span>{copy.focusHoursLess}</span>
            {TONES.map(shade => (
              <span key={shade} aria-hidden className={`h-2 w-4 rounded-sm ${shade}`} />
            ))}
            <span>{copy.focusHoursMore}</span>
          </div>
        </>
      )}
    </section>
  )
}
