import { formatDuration } from '@echofocus/shared'
import type { Locale } from '@/lib/i18n-server'

interface Props {
  /** Productive seconds per local hour, summed over the period. 24 entries. */
  hours: number[]
  days: number
  copy: Locale['trends']
}

// Six steps: an untouched hour reads as the hairline color, then five grades
// of the productive green up to the peak hour.
const LEVELS = [20, 35, 55, 75, 100]

function cellColor(seconds: number, peak: number): string {
  if (seconds <= 0) return 'var(--border)'
  const level = LEVELS[Math.min(4, Math.ceil((seconds / peak) * 5) - 1)]
  return `color-mix(in srgb, var(--fill-productive) ${level}%, transparent)`
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
    <section className="border-t border-line pt-9">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-label text-content-secondary">{copy.focusHours}</h2>
        {ranked.length > 0 && (
          <p className="text-caption text-content-tertiary">
            {copy.focusHoursTop}: {ranked.slice(0, 3).map(h => hourLabel(h.hour)).join(', ')}
          </p>
        )}
      </div>

      {peak === 0 ? (
        <p className="mt-4 max-w-xl text-body text-content-secondary">
          {copy.focusHoursEmpty}
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-xl text-body text-content-secondary">
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
                    className="h-9 w-full rounded-sm"
                    style={{
                      background: cellColor(seconds, peak),
                      ...(hour === peakHour ? { boxShadow: 'inset 0 0 0 1px var(--productive)' } : {}),
                    }}
                  />
                  <span
                    aria-hidden
                    className="text-caption"
                    style={{ color: hour === peakHour ? 'var(--productive)' : 'var(--text-tertiary)' }}
                  >
                    {String(hour).padStart(2, '0')}
                  </span>
                  <span className="sr-only">{label}</span>
                </li>
              )
            })}
          </ul>

          <div className="mt-5 flex items-center gap-2 text-caption text-content-tertiary">
            <span>{copy.focusHoursLess}</span>
            <span aria-hidden className="h-2 w-4 rounded-sm" style={{ background: 'var(--border)' }} />
            {LEVELS.map(level => (
              <span
                key={level}
                aria-hidden
                className="h-2 w-4 rounded-sm"
                style={{ background: `color-mix(in srgb, var(--fill-productive) ${level}%, transparent)` }}
              />
            ))}
            <span>{copy.focusHoursMore}</span>
          </div>
        </>
      )}
    </section>
  )
}
