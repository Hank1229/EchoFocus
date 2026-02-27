import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDuration } from '@echofocus/shared'
import { Zap, Coffee, Minus, FileText } from 'lucide-react'

interface TopDomain {
  domain: string
  seconds: number
  category: 'productive' | 'distraction' | 'neutral' | 'uncategorized'
}

interface SyncedRow {
  date: string
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
  top_domains: TopDomain[]
  synced_at: string
}

const CATEGORY_LABELS = {
  productive: 'Productive',
  distraction: 'Breaks & Browsing',
  neutral: 'Neutral',
  uncategorized: 'Uncategorized',
}

function CategoryIcon({ category }: { category: TopDomain['category'] }) {
  switch (category) {
    case 'productive': return <Zap size={14} strokeWidth={1.75} className="text-emerald-400 flex-shrink-0" />
    case 'distraction': return <Coffee size={14} strokeWidth={1.75} className="text-orange-400 flex-shrink-0" />
    default: return <Minus size={14} strokeWidth={1.75} className="text-slate-400 flex-shrink-0" />
  }
}

interface AiAnalysisRow {
  date: string
  analysis_text: string
  focus_score: number
  created_at: string
}

export default async function TodayPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data }, { data: aiData }] = await Promise.all([
    supabase
      .from('synced_aggregates')
      .select('*')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ai_analyses')
      .select('date, analysis_text, focus_score, created_at')
      .eq('user_id', user!.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const row = data as SyncedRow | null
  const latestAi = aiData as AiAnalysisRow | null

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  }

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <DashboardHeader title="Today's Overview" userEmail={user?.email ?? undefined} />

      <main className="flex-1 px-6 py-8">
        {row ? (
          <>
            {/* Date + sync info — full width */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-400">{formatDate(row.date)}</p>
              <p className="text-xs text-slate-600">Synced {formatSyncTime(row.synced_at)}</p>
            </div>

            {/* 3-column responsive grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── Left col: Focus Score ─────────────────────────── */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5 h-full">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Focus Score</p>
                  <div className="flex flex-col items-center gap-3 py-2">
                    <FocusRing score={row.focus_score} />
                    <div className="text-center">
                      <p className="text-5xl font-bold text-slate-100 tabular-nums">{row.focus_score}</p>
                      <p className="text-xs text-slate-500 mt-1">pts</p>
                      <p className="text-sm text-slate-400 mt-2">{scoreLabel(row.focus_score)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Center col: Time Breakdown + Sites ───────────── */}
              <div className="lg:col-span-6 space-y-6">

                {/* Time Breakdown */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Time Breakdown</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Productive', seconds: row.productive_seconds, color: 'text-emerald-400', bg: 'bg-emerald-500/10', Icon: Zap },
                      { label: 'Breaks & Browsing', seconds: row.distraction_seconds, color: 'text-orange-400', bg: 'bg-orange-500/10', Icon: Coffee },
                      { label: 'Neutral', seconds: row.neutral_seconds + row.uncategorized_seconds, color: 'text-slate-400', bg: 'bg-slate-800', Icon: Minus },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <s.Icon size={14} strokeWidth={1.75} className={s.color} />
                        </div>
                        <p className={`text-xl font-bold ${s.color}`}>{formatDuration(s.seconds)}</p>
                        <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {row.total_seconds > 0 && (
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden flex mt-4">
                      <div className="bg-emerald-500 h-full" style={{ width: `${(row.productive_seconds / row.total_seconds) * 100}%` }} />
                      <div className="bg-orange-500 h-full" style={{ width: `${(row.distraction_seconds / row.total_seconds) * 100}%` }} />
                      <div className="bg-slate-500 h-full" style={{ width: `${((row.neutral_seconds + row.uncategorized_seconds) / row.total_seconds) * 100}%` }} />
                    </div>
                  )}
                </div>

                {/* Today's Sites */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Today's Sites</p>
                  {row.top_domains.length === 0 ? (
                    <p className="text-sm text-slate-500">No data</p>
                  ) : (
                    <ul className="space-y-3">
                      {row.top_domains.slice(0, 10).map(d => (
                        <li key={d.domain} className="flex items-center gap-3">
                          <CategoryIcon category={d.category} />
                          <span className="flex-1 text-sm text-slate-300 truncate">{d.domain}</span>
                          <span className="text-xs text-slate-500 flex-shrink-0">{CATEGORY_LABELS[d.category]}</span>
                          <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">{formatDuration(d.seconds)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* ── Right col: Daily Insight ─────────────────────── */}
              <div className="lg:col-span-3">
                {latestAi ? (
                  <div className="rounded-2xl border border-slate-800 border-l-4 border-l-green-500 bg-slate-900 shadow-sm p-5 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <FileText size={18} strokeWidth={1.75} className="text-blue-400" />
                        <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">Daily Insight</p>
                      </div>
                      <Link href="/dashboard/ai-insights" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                        View all →
                      </Link>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{latestAi.analysis_text}</p>
                    <p className="text-xs text-slate-600 mt-3">{latestAi.date}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 shadow-sm p-5 text-center h-full flex flex-col items-center justify-center gap-2">
                    <p className="text-sm text-slate-500">No daily insights yet</p>
                    <Link href="/dashboard/ai-insights" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                      Go to Daily Snapshots to analyze →
                    </Link>
                  </div>
                )}
              </div>

            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">📭</p>
            <h2 className="text-xl font-bold text-slate-300 mb-2">No Synced Data Yet</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Install the EchoFocus Chrome extension and sign in — data syncs here automatically at 00:05 daily.
              You can also sync manually from the extension settings under the Account tab.
            </p>
          </div>
        )}
      </main>
    </>
  )
}

function scoreLabel(score: number) {
  if (score >= 70) return 'Excellent 🎉'
  if (score >= 40) return 'Average 💪'
  return 'Room to grow 📈'
}

function FocusRing({ score }: { score: number }) {
  const size = 100
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={progress}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}
