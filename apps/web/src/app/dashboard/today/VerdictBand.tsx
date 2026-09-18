'use client'

import { Flame } from 'lucide-react'
import { formatDuration } from '@echofocus/shared'
import { useLocale } from '@/lib/i18n'
import ScoreDial from '@/components/dashboard/ScoreDial'
import DayWaveform from '@/components/dashboard/DayWaveform'

interface Props {
  userName: string
  streak: { current: number; best: number }
  focusScore: number
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  /** 24 local-hour buckets of productive seconds; null on pre-waveform rows. */
  productiveByHour: number[] | null
}

function greetingFor(hour: number, t: { goodMorning: string; goodAfternoon: string; goodEvening: string; goodNight: string }) {
  if (hour >= 5 && hour < 12) return t.goodMorning
  if (hour >= 12 && hour < 18) return t.goodAfternoon
  if (hour >= 18 && hour < 23) return t.goodEvening
  return t.goodNight
}

export default function VerdictBand({
  userName,
  streak,
  focusScore,
  productiveSeconds,
  distractionSeconds,
  neutralSeconds,
  uncategorizedSeconds,
  productiveByHour,
}: Props) {
  const { t } = useLocale()
  const greeting = greetingFor(new Date().getHours(), t.today)

  const neutral = neutralSeconds + uncategorizedSeconds
  // Compose against TRACKED time, not the 86400s day: a normal 7-hour day
  // against a 24-hour scale leaves three quarters of the bar empty.
  const tracked = productiveSeconds + distractionSeconds + neutral

  const parts = [
    { key: 'productive', label: t.today.productive, seconds: productiveSeconds, bar: 'bg-productive', dot: 'bg-productive' },
    { key: 'distraction', label: t.today.breaksAndBrowsing, seconds: distractionSeconds, bar: 'bg-breaks', dot: 'bg-breaks' },
    { key: 'neutral', label: t.today.neutral, seconds: neutral, bar: 'bg-neutral-deep', dot: 'bg-neutral-deep' },
  ]

  const share = (seconds: number) => (tracked > 0 ? (seconds / tracked) * 100 : 0)

  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9">
          <ScoreDial score={focusScore} label={t.today.focusScore} />

          <div className="relative z-10 min-w-0">
            <h2 className="font-display text-[1.875rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[2.25rem]">
              {greeting}{userName ? `, ${userName}` : ''}
            </h2>
            <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-slate-400">
              {/* Connectives carry their own leading space so zh-TW can attach
                  punctuation directly to the number without a stray gap. */}
              {t.today.focusedFor}{' '}
              <span className="font-semibold tabular-nums text-slate-200">{formatDuration(productiveSeconds)}</span>
              {t.today.trackedOf}{' '}
              <span className="font-semibold tabular-nums text-slate-200">{formatDuration(tracked)}</span>
              {t.today.todayTotalSuffix}
            </p>
            {streak.current > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Flame size={13} strokeWidth={1.75} className="text-productive" />
                {t.today.streakDays.replace('{n}', String(streak.current))}
                {streak.best > streak.current && (
                  <>
                    <span aria-hidden className="h-3 w-px bg-slate-700" />
                    <span className="text-slate-600">
                      {t.today.streakBest.replace('{n}', String(streak.best))}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* The day's composition sits beside the verdict rather than under it,
            so the band reads as one figure with its breakdown — and the right
            half of the row carries data instead of air. */}
        <dl className="relative z-10 grid gap-2.5 sm:grid-cols-3 lg:w-64 lg:flex-shrink-0 lg:grid-cols-1">
          {parts.map(p => (
            <div key={p.key} className="flex items-baseline gap-2.5">
              <span aria-hidden className={`h-1.5 w-1.5 flex-shrink-0 translate-y-[-2px] rounded-full ${p.dot}`} />
              <dt className="min-w-0 flex-1 truncate text-xs text-slate-500">{p.label}</dt>
              <dd className="flex-shrink-0 font-display text-sm font-semibold tabular-nums text-slate-200">
                {formatDuration(p.seconds)}
              </dd>
              <span className="w-8 flex-shrink-0 text-right text-xs tabular-nums text-slate-600">
                {Math.round(share(p.seconds))}%
              </span>
            </div>
          ))}
        </dl>
      </div>

      {/* The rule under the band is the day itself: 24 hours of focus drawn
          as a waveform — the echo motif made of real data. Rows synced before
          the hourly buckets existed fall back to the flat composition bar. */}
      <div className="relative z-10 mt-9">
        {productiveByHour ? (
          <DayWaveform hours={productiveByHour} label={t.today.focusByHour} />
        ) : (
          <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
            {parts.map(p => (
              <div key={p.key} className={p.bar} style={{ width: `${share(p.seconds)}%` }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
