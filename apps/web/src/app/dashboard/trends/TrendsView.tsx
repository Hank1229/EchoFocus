import { formatDuration } from '@echofocus/shared'
import type { Locale } from '@/lib/i18n-server'
import ActivityBarChart from '@/components/charts/ActivityBarChart'
import FocusScoreChart from '@/components/charts/FocusScoreChart'
import { scoreNumeralClass } from '@/components/dashboard/score'
import FocusHours from './FocusHours'

export interface TrendsViewProps {
  days: number
  avgScore: number
  daysTracked: number
  totalProductive: number
  totalBreaks: number
  bestDay: { label: string; score: number } | null
  /** Productive seconds per local hour, summed over the period. 24 entries. */
  hours: number[]
  barData: { date: string; productive: number; distraction: number; neutral: number }[]
  scoreData: { date: string; score: number }[]
  copy: Locale['trends']
  neutralLabel: string
}

export default function TrendsView({
  days,
  avgScore,
  daysTracked,
  totalProductive,
  totalBreaks,
  bestDay,
  hours,
  barData,
  scoreData,
  copy,
  neutralLabel,
}: TrendsViewProps) {
  const stats = [
    { label: copy.productiveTime, value: formatDuration(totalProductive) },
    { label: copy.breaksAndBrowsing, value: formatDuration(totalBreaks) },
    { label: copy.daysTracked, value: String(daysTracked) },
    {
      label: copy.bestDay,
      value: bestDay ? String(bestDay.score) : '—',
      note: bestDay?.label,
    },
  ]

  return (
    <div className="space-y-10">
      {/* The trajectory leads: the average is the figure, the line is its
          shape. Neither works as a lonely stat card, so they share one band. */}
      <section className="rise rise-1 border-b border-slate-800/80 pb-9">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-base font-semibold tracking-tight text-slate-100">
            {copy.focusScoreTrend}
          </h2>
          <p className="flex-shrink-0 text-xs text-slate-600">{copy.dashedLineNote}</p>
        </div>

        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
          <div className="flex-shrink-0 lg:w-40">
            <p className={`font-display text-6xl font-semibold leading-none tracking-tight tabular-nums ${scoreNumeralClass(avgScore)}`}>
              {avgScore}
            </p>
            <p className="mt-3 max-w-[9rem] text-xs leading-relaxed text-slate-500">
              {days}{copy.avgFocusScore}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <FocusScoreChart data={scoreData} />
          </div>
        </div>
      </section>

      <section className="rise rise-2">
        <dl className="grid grid-cols-2 gap-y-7 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={i > 0 ? 'sm:border-l sm:border-slate-800/80 sm:pl-6' : ''}
            >
              <dd className="font-display text-2xl font-semibold tabular-nums text-slate-100">{stat.value}</dd>
              <dt className="mt-1.5 text-xs text-slate-500">{stat.label}</dt>
              {stat.note && <p className="mt-0.5 text-xs text-slate-600">{stat.note}</p>}
            </div>
          ))}
        </dl>
      </section>

      <section className="rise rise-3 border-t border-slate-800/80 pt-9">
        <h2 className="font-display text-base font-semibold tracking-tight text-slate-100">
          {copy.dailyTimeBreakdown}
        </h2>
        <div className="mt-5">
          <ActivityBarChart
            data={barData}
            labels={{
              productive: copy.productiveTime,
              distraction: copy.breaksAndBrowsing,
              neutral: neutralLabel,
            }}
          />
        </div>
      </section>

      {/* daysTracked, not the requested window: two synced days shouldn't
          claim a 30-day pattern. */}
      <FocusHours hours={hours} days={daysTracked} copy={copy} />
    </div>
  )
}
