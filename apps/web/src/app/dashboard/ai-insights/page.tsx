import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import AnalyzeButton from './AnalyzeButton'
import { redirect } from 'next/navigation'
import { Lightbulb } from 'lucide-react'
import { getLocale } from '@/lib/i18n-server'

interface AiAnalysisRow {
  id: string
  date: string
  analysis_text: string
  focus_score: number
  created_at: string
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-productive'
  if (score >= 40) return 'text-brand'
  return 'text-neutral'
}

function scoreBg(score: number) {
  if (score >= 70) return 'bg-productive/10'
  if (score >= 40) return 'bg-brand/10'
  return 'bg-neutral/10'
}

export default async function AiInsightsPage() {
  const supabase = await createClient()
  const { t, language } = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('ai_analyses')
    .select('id, date, analysis_text, focus_score, created_at')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .limit(30)

  const analyses = (data ?? []) as AiAnalysisRow[]

  const dateLocale = language === 'zh-TW' ? 'zh-TW' : 'en-US'

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  }

  return (
    <>
      <DashboardHeader title={t.aiInsights.title} userEmail={user?.email ?? undefined} avatarUrl={user?.user_metadata?.avatar_url as string | undefined} />

      <main className="flex-1 px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left: Generate Now ───────────────────────────── */}
          <div className="lg:col-span-5">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div>
                <p className="mb-1 font-display text-base font-semibold tracking-tight text-slate-100">{t.aiInsights.generateNow}</p>
                <p className="text-sm text-slate-400">
                  {t.aiInsights.generateDesc}
                </p>
              </div>
              <AnalyzeButton />
            </div>
          </div>

          {/* ── Right: Snapshot History ───────────────────────── */}
          <div className="lg:col-span-7">
            <p className="mb-4 text-sm font-medium text-slate-400">{t.aiInsights.snapshotHistory}</p>

            {analyses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-12 text-center">
                <div className="mb-3 flex justify-center">
                  <Lightbulb size={36} strokeWidth={1.5} className="text-slate-600" />
                </div>
                <p className="mb-1 font-medium text-slate-300">{t.aiInsights.noSnapshots}</p>
                <p className="text-sm text-slate-500">{t.aiInsights.noSnapshotsDesc}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analyses.map(row => (
                  <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{formatDate(row.date)}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {new Date(row.created_at).toLocaleString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} {t.aiInsights.analyzed}
                        </p>
                      </div>
                      <span className={`rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums ${scoreBg(row.focus_score)} ${scoreColor(row.focus_score)}`}>
                        {row.focus_score} {t.aiInsights.pts}
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
