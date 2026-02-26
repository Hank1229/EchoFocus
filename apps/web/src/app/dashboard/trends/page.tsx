import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import ActivityBarChart from '@/components/charts/ActivityBarChart'
import FocusScoreChart from '@/components/charts/FocusScoreChart'
import { formatDuration } from '@echofocus/shared'
import { redirect } from 'next/navigation'

interface SyncedRow {
  date: string
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period } = await searchParams
  const days = period === '30' ? 30 : 7

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('synced_aggregates')
    .select('date, total_seconds, productive_seconds, distraction_seconds, neutral_seconds, uncategorized_seconds, focus_score')
    .eq('user_id', user!.id)
    .order('date', { ascending: true })
    .limit(days)

  const rows = (data ?? []) as SyncedRow[]

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
      <DashboardHeader title="Trends" userEmail={user?.email ?? undefined} />

      <main className="flex-1 px-6 py-8 space-y-6">
        {/* Period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Show:</span>
          <a href="/dashboard/trends?period=7"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === 7 ? 'bg-green-500/10 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}>
            Last 7 days
          </a>
          <a href="/dashboard/trends?period=30"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === 30 ? 'bg-green-500/10 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}>
            Last 30 days
          </a>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">📉</p>
            <h2 className="text-xl font-bold text-slate-300 mb-2">No Trend Data Yet</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Install the extension and use it for a few days — trend charts will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Summary stats — responsive horizontal row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: `${days}-Day Avg Focus Score`, value: `${avgScore}`, color: 'text-green-400' },
                { label: 'Productive Time', value: formatDuration(totalProductive), color: 'text-emerald-400' },
                { label: 'Breaks & Browsing', value: formatDuration(totalDistraction), color: 'text-orange-400' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Activity bar chart */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-6">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-5">Daily Time Breakdown</p>
              <ActivityBarChart data={barData} />
            </div>

            {/* Focus score line chart */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-6">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-5">Focus Score Trend</p>
              <FocusScoreChart data={scoreData} />
              <p className="text-xs text-slate-600 mt-2">Dashed line = 70-point target</p>
            </div>
          </>
        )}
      </main>
    </>
  )
}
