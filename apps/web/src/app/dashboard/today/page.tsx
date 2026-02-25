import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDuration } from '@echofocus/shared'

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

const CATEGORY_COLORS = {
  productive: 'bg-green-500',
  distraction: 'bg-red-500',
  neutral: 'bg-slate-500',
  uncategorized: 'bg-slate-600',
}

const CATEGORY_LABELS = {
  productive: '生產力',
  distraction: '分心',
  neutral: '中性',
  uncategorized: '未分類',
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
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  }

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <DashboardHeader title="今日概覽" userEmail={user?.email ?? undefined} />

      <main className="flex-1 px-6 py-8 space-y-6 max-w-3xl">
        {row ? (
          <>
            {/* Date + sync info */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{formatDate(row.date)}</p>
              <p className="text-xs text-slate-600">同步於 {formatSyncTime(row.synced_at)}</p>
            </div>

            {/* Focus score */}
            <div className="bg-slate-800 rounded-2xl p-6 flex items-center gap-6">
              <FocusRing score={row.focus_score} />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">專注分數</p>
                <p className="text-4xl font-bold text-slate-100">{row.focus_score}</p>
                <p className="text-sm text-slate-400 mt-1">{scoreLabel(row.focus_score)}</p>
              </div>
            </div>

            {/* Stats breakdown */}
            <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">時間分布</p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: '生產效率', seconds: row.productive_seconds, color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: '分心時間', seconds: row.distraction_seconds, color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: '中性瀏覽', seconds: row.neutral_seconds + row.uncategorized_seconds, color: 'text-slate-400', bg: 'bg-slate-700' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                    <p className={`text-xl font-bold ${s.color}`}>{formatDuration(s.seconds)}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {row.total_seconds > 0 && (
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden flex">
                  <div className="bg-green-500 h-full" style={{ width: `${(row.productive_seconds / row.total_seconds) * 100}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${(row.distraction_seconds / row.total_seconds) * 100}%` }} />
                  <div className="bg-slate-500 h-full" style={{ width: `${((row.neutral_seconds + row.uncategorized_seconds) / row.total_seconds) * 100}%` }} />
                </div>
              )}
            </div>

            {/* Top domains */}
            <div className="bg-slate-800 rounded-2xl p-6">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">今日網站</p>
              {row.top_domains.length === 0 ? (
                <p className="text-sm text-slate-500">無資料</p>
              ) : (
                <ul className="space-y-3">
                  {row.top_domains.slice(0, 10).map(d => (
                    <li key={d.domain} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[d.category]}`} />
                      <span className="flex-1 text-sm text-slate-300 truncate">{d.domain}</span>
                      <span className="text-xs text-slate-500 flex-shrink-0">{CATEGORY_LABELS[d.category]}</span>
                      <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">{formatDuration(d.seconds)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* AI insight card */}
            {latestAi ? (
              <div className="bg-slate-800 rounded-2xl p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">🤖 AI 洞察</p>
                  <Link href="/dashboard/ai-insights" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                    查看全部 →
                  </Link>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{latestAi.analysis_text}</p>
                <p className="text-xs text-slate-600 mt-3">{latestAi.date}</p>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-dashed border-slate-700 text-center">
                <p className="text-sm text-slate-500 mb-2">尚無 AI 洞察</p>
                <Link href="/dashboard/ai-insights" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                  前往 AI 洞察頁面分析 →
                </Link>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">📭</p>
            <h2 className="text-xl font-bold text-slate-300 mb-2">尚未有同步資料</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              安裝 EchoFocus Chrome 擴充功能並登入帳戶後，
              資料會在每日 00:05 自動同步至此。
              也可在擴充功能設定的「帳戶」頁籤手動立即同步。
            </p>
          </div>
        )}
      </main>
    </>
  )
}

function scoreLabel(score: number) {
  if (score >= 70) return '優秀 🎉'
  if (score >= 40) return '普通 💪'
  return '待改善 📈'
}

function FocusRing({ score }: { score: number }) {
  const size = 80
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={progress}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}
