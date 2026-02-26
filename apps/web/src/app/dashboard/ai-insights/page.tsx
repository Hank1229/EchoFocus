import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import AnalyzeButton from './AnalyzeButton'
import { redirect } from 'next/navigation'
import { Lightbulb } from 'lucide-react'

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
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  }

  return (
    <>
      <DashboardHeader title="Daily Snapshots" userEmail={user?.email ?? undefined} />

      <main className="flex-1 px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left: Generate Now ───────────────────────────── */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-1">Generate Now</p>
                <p className="text-sm text-slate-400">
                  Use Gemini AI to analyze today's browsing patterns and get personalized productivity tips.
                </p>
              </div>
              <AnalyzeButton />
            </div>
          </div>

          {/* ── Right: Snapshot History ───────────────────────── */}
          <div className="lg:col-span-7">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Snapshot History</p>

            {analyses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 shadow-sm p-12 text-center">
                <div className="flex justify-center mb-3">
                  <Lightbulb size={36} strokeWidth={1.5} className="text-slate-600" />
                </div>
                <p className="text-slate-300 font-medium mb-1">No Daily Snapshots Yet</p>
                <p className="text-sm text-slate-500">Click the button to analyze today's data and generate your first snapshot</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analyses.map(row => (
                  <div key={row.id} className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{formatDate(row.date)}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {new Date(row.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} analyzed
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${scoreBg(row.focus_score)} ${scoreColor(row.focus_score)}`}>
                        {row.focus_score} pts
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{row.analysis_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  )
}
