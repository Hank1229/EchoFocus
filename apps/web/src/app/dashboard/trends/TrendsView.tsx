import { formatDuration } from '@echofocus/shared'
import type { Locale } from '@/lib/i18n-server'
import ActivityBarChart from '@/components/charts/ActivityBarChart'
import FocusScoreChart from '@/components/charts/FocusScoreChart'
import { scoreColorVar } from '@/components/dashboard/score'
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
      <section className="border-b border-line pb-9">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-label text-content-secondary">
            {copy.focusScoreTrend}
          </h2>
          <p className="flex-shrink-0 text-caption text-content-tertiary">{copy.dashedLineNote}</p>
        </div>

        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
          <div className="flex-shrink-0 lg:w-40">
            <p className="text-hero" style={{ color: scoreColorVar(avgScore) }}>
              {avgScore}
            </p>
            <p className="mt-2 max-w-[9rem] text-caption text-content-tertiary">
              {days}{copy.avgFocusScore}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <FocusScoreChart data={scoreData} />
          </div>
        </div>
      </section>

      <section>
        <dl className="grid grid-cols-2 gap-y-7 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={i > 0 ? 'sm:border-l sm:border-line sm:pl-6' : ''}
            >
              <dd className="text-stat text-content">{stat.value}</dd>
              <dt className="mt-1.5 text-caption text-content-secondary">{stat.label}</dt>
              {stat.note && <p className="mt-0.5 text-caption text-content-tertiary">{stat.note}</p>}
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-line pt-9">
        <h2 className="text-label text-content-secondary">
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
