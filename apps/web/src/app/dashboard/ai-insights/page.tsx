import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import AnalyzeButton from './AnalyzeButton'
import { redirect } from 'next/navigation'

interface AiAnalysisRow {
  id: string
  date: string
  analysis_text: string
  focus_score: number
  created_at: string
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBg(score: number) {
  if (score >= 70) return 'bg-green-500/10'
  if (score >= 40) return 'bg-yellow-500/10'
  return 'bg-red-500/10'
}

export default async function AiInsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('ai_analyses')
    .select('id, date, analysis_text, focus_score, created_at')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .limit(30)

  const analyses = (data ?? []) as AiAnalysisRow[]

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  }

  return (
    <>
      <DashboardHeader title="AI 洞察" userEmail={user?.email ?? undefined} />

      <main className="flex-1 px-6 py-8 space-y-6 max-w-3xl">
        {/* Analyze section */}
        <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">立即分析</p>
            <p className="text-sm text-slate-400">
              使用 Gemini AI 分析今日的瀏覽模式，獲得個人化生產力建議。
            </p>
          </div>
          <AnalyzeButton />
        </div>

        {/* History */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">歷史洞察</p>

          {analyses.length === 0 ? (
            <div className="bg-slate-800/50 rounded-2xl p-12 text-center border border-dashed border-slate-700">
              <p className="text-3xl mb-3">🤖</p>
              <p className="text-slate-300 font-medium mb-1">尚無 AI 洞察</p>
              <p className="text-sm text-slate-500">點擊上方按鈕分析今日數據，生成你的第一份 AI 洞察報告</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map(row => (
                <div key={row.id} className="bg-slate-800 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{formatDate(row.date)}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {new Date(row.created_at).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 分析
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${scoreBg(row.focus_score)} ${scoreColor(row.focus_score)}`}>
                      {row.focus_score} 分
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{row.analysis_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
