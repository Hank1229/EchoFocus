import { redirect } from 'next/navigation'
import { Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import AnalyzeButton from './AnalyzeButton'
import SnapshotList, { type Snapshot } from './SnapshotList'

interface AiAnalysisRow {
  id: string
  date: string
  analysis_text: string
  focus_score: number
  created_at: string
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

  const snapshots: Snapshot[] = analyses.map(row => ({
    id: row.id,
    dateLabel: new Date(row.date + 'T00:00:00').toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    analyzedLabel: `${new Date(row.created_at).toLocaleString(dateLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} ${t.aiInsights.analyzed}`,
    score: row.focus_score,
    text: row.analysis_text,
  }))

  return (
    <>
      <DashboardHeader
        title={t.aiInsights.title}
        userEmail={user?.email ?? undefined}
        avatarUrl={user?.user_metadata?.avatar_url as string | undefined}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        <AnalyzeButton />

        <div className="mt-10">
          {snapshots.length === 0 ? (
            <div className="max-w-md">
              <Lightbulb size={28} strokeWidth={1.5} className="text-slate-600" />
              <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-slate-200">
                {t.aiInsights.noSnapshots}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{t.aiInsights.noSnapshotsDesc}</p>
            </div>
          ) : (
            <SnapshotList snapshots={snapshots} />
          )}
        </div>
      </main>
    </>
  )
}
