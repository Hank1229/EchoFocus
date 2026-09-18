import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LineChart } from 'lucide-react'
import { getDateNDaysAgo, emptyProductiveByHour, HOURS_PER_DAY } from '@echofocus/shared'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import TrendsView from './TrendsView'

interface SyncedRow {
  date: string
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
  productive_by_hour: number[] | null
}

// Fold the period into 24 buckets. Rows synced before the hourly breakdown
// existed carry the column's 24 zeros; a row that comes back malformed is
// skipped rather than turned into NaN.
function sumHours(rows: SyncedRow[]): number[] {
  const hours = emptyProductiveByHour()
  for (const row of rows) {
    if (!Array.isArray(row.productive_by_hour)) continue
    for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
      const seconds = row.productive_by_hour[hour]
      if (typeof seconds === 'number' && seconds > 0) hours[hour] += seconds
    }
  }
  return hours
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period } = await searchParams
  const days = period === '30' ? 30 : 7

  const supabase = await createClient()
  const { t, language } = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Newest N days, then reverse so charts read left→right chronologically.
  // (ascending + limit would return the OLDEST rows and freeze the charts in the past)
  const { data, error: loadError } = await supabase
    .from('synced_aggregates')
    .select('date, total_seconds, productive_seconds, distraction_seconds, neutral_seconds, uncategorized_seconds, focus_score, productive_by_hour')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(days)

  const newest = (data ?? []) as SyncedRow[]
  // "Last N days" means a calendar window, not "last N synced rows" — with
  // sync gaps the latter silently spans months. Floor the window at newest
  // date − (N−1), anchored to the data's own (user-local) dates: this server
  // renders in UTC, so never derive the cutoff from the server clock.
  const cutoff = newest.length
    ? getDateNDaysAgo(days - 1, new Date(newest[0].date + 'T00:00:00'))
    : ''
  const rows = newest.filter(r => r.date >= cutoff).reverse()

  const dateLocale = language === 'zh-TW' ? 'zh-TW' : 'en-US'

  const shortDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })

  const barData = rows.map(r => ({
    date: shortDate(r.date),
    productive: r.productive_seconds,
    distraction: r.distraction_seconds,
    neutral: r.neutral_seconds + r.uncategorized_seconds,
  }))

  const scoreData = rows.map(r => ({ date: shortDate(r.date), score: r.focus_score }))

  const avgScore = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.focus_score, 0) / rows.length)
    : 0

  const totalProductive = rows.reduce((s, r) => s + r.productive_seconds, 0)
  const totalBreaks = rows.reduce((s, r) => s + r.distraction_seconds, 0)

  const best = rows.reduce<SyncedRow | null>(
    (top, r) => (!top || r.focus_score > top.focus_score ? r : top),
    null,
  )

  const periods = [7, 30] as const

  return (
    <>
      <DashboardHeader
        title={t.trends.title}
        userEmail={user?.email ?? undefined}
        avatarUrl={user?.user_metadata?.avatar_url as string | undefined}
        context={
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 p-0.5">
            {periods.map(p => (
              <Link
                key={p}
                href={`/dashboard/trends?period=${p}`}
                aria-current={days === p ? 'true' : undefined}
                className={`pressable rounded-md px-3 py-1 text-xs font-medium ${
                  days === p ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p === 7 ? t.trends.last7days : t.trends.last30days}
              </Link>
            ))}
          </div>
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        {loadError ? (
          <p role="alert" className="max-w-xl rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
            {t.common.loadFailed}{loadError.message}
          </p>
        ) : rows.length === 0 ? (
          <div className="max-w-md border-t border-slate-800/80 pt-10">
            <LineChart size={28} strokeWidth={1.5} className="text-slate-600" />
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-slate-200">
              {t.trends.noTrendData}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{t.trends.noTrendDesc}</p>
          </div>
        ) : (
          <TrendsView
            days={days}
            avgScore={avgScore}
            daysTracked={rows.length}
            totalProductive={totalProductive}
            totalBreaks={totalBreaks}
            bestDay={best ? { label: shortDate(best.date), score: best.focus_score } : null}
            hours={sumHours(rows)}
            barData={barData}
            scoreData={scoreData}
            copy={t.trends}
            neutralLabel={t.today.neutral}
          />
        )}
      </main>
    </>
  )
}
