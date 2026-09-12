import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import ActivityBarChart from '@/components/charts/ActivityBarChart'
import FocusScoreChart from '@/components/charts/FocusScoreChart'
import { formatDuration, getDateNDaysAgo } from '@echofocus/shared'
import { redirect } from 'next/navigation'
import { LineChart } from 'lucide-react'
import { getLocale } from '@/lib/i18n-server'

interface SyncedRow {
  date: string
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
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
  const { data } = await supabase
    .from('synced_aggregates')
    .select('date, total_seconds, productive_seconds, distraction_seconds, neutral_seconds, uncategorized_seconds, focus_score')
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

  const shortDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
  }

  const barData = rows.map(r => ({
    date: shortDate(r.date),
    productive: r.productive_seconds,
    distraction: r.distraction_seconds,
    neutral: r.neutral_seconds + r.uncategorized_seconds,
  }))

  const scoreData = rows.map(r => ({
    date: shortDate(r.date),
    score: r.focus_score,
  }))

  const avgScore = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.focus_score, 0) / rows.length)
    : 0

  const totalProductive = rows.reduce((s, r) => s + r.productive_seconds, 0)
  const totalDistraction = rows.reduce((s, r) => s + r.distraction_seconds, 0)

  return (
    <>
      <DashboardHeader title={t.trends.title} userEmail={user?.email ?? undefined} avatarUrl={user?.user_metadata?.avatar_url as string | undefined} />

      <main className="flex-1 px-6 py-8 space-y-6">
        {/* Period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{t.trends.show}</span>
          <a href="/dashboard/trends?period=7"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === 7 ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:text-slate-300'}`}>
            {t.trends.last7days}
          </a>
          <a href="/dashboard/trends?period=30"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === 30 ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:text-slate-300'}`}>
            {t.trends.last30days}
          </a>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <LineChart size={36} strokeWidth={1.5} className="mb-4 text-slate-600" />
            <h2 className="mb-2 font-display text-xl font-semibold tracking-tight text-slate-200">{t.trends.noTrendData}</h2>
            <p className="max-w-sm text-sm text-slate-500">
              {t.trends.noTrendDesc}
            </p>
          </div>
        ) : (
          <>
            {/* Summary stats — the average leads, the two totals sit under it */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="font-display text-4xl font-semibold tabular-nums leading-none tracking-tight text-brand">
                  {avgScore}
                </p>
                <p className="mt-2.5 text-xs text-slate-500">{days}{t.trends.avgFocusScore}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                {[
                  { label: t.trends.productiveTime, value: formatDuration(totalProductive), color: 'text-productive' },
                  { label: t.trends.breaksAndBrowsing, value: formatDuration(totalDistraction), color: 'text-breaks' },
                ].map(s => (
                  <div key={s.label} className="flex flex-col justify-center border-t border-slate-800 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                    <p className={`text-2xl font-semibold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="mt-1.5 text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity bar chart */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="mb-5 text-sm font-medium text-slate-400">{t.trends.dailyTimeBreakdown}</p>
              <ActivityBarChart
                data={barData}
                labels={{
                  productive: t.trends.productiveTime,
                  distraction: t.trends.breaksAndBrowsing,
                  neutral: t.today.neutral,
                }}
              />
            </div>

            {/* Focus score line chart */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="mb-5 text-sm font-medium text-slate-400">{t.trends.focusScoreTrend}</p>
              <FocusScoreChart data={scoreData} />
              <p className="text-xs text-slate-600 mt-2">{t.trends.dashedLineNote}</p>
            </div>
          </>
        )}
      </main>
    </>
  )
}
