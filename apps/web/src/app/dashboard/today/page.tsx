import { redirect } from 'next/navigation'
import { Inbox } from 'lucide-react'
import { formatDuration, getTodayDateString } from '@echofocus/shared'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import VerdictBand from './VerdictBand'
import DailyInsight from './DailyInsight'
import SiteRanking, { type RankedSite } from './SiteRanking'

interface SyncedRow {
  date: string
  total_seconds: number
  productive_seconds: number
  distraction_seconds: number
  neutral_seconds: number
  uncategorized_seconds: number
  focus_score: number
  top_domains: RankedSite[]
  synced_at: string
}

interface AiAnalysisRow {
  date: string
  analysis_text: string
  focus_score: number
  created_at: string
}

export default async function TodayPage() {
  const supabase = await createClient()
  const { t, language } = await getLocale()

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

  const dateLocale = language === 'zh-TW' ? 'zh-TW' : 'en-US'

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString(dateLocale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

  const formatSyncTime = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? ''
  // Use the displayed aggregate's own date so the AI card queries/regenerates
  // the same day the page is showing (extension keys dates in the USER's local
  // time; this server renders in UTC, so never derive "today" here).
  const todayDate = row?.date ?? getTodayDateString()
  // latestAi is the newest analysis for ANY date — only show it here when it
  // belongs to the displayed day, otherwise a stale insight reads as today's.
  const todaysAi = latestAi?.date === todayDate ? latestAi : null

  return (
    <>
      <DashboardHeader
        title={t.today.title}
        userEmail={user?.email ?? undefined}
        avatarUrl={user?.user_metadata?.avatar_url as string | undefined}
        context={
          row && (
            <p className="truncate text-xs text-slate-500">
              <span className="text-slate-400">{formatDate(row.date)}</span>
              <span className="mx-2 text-slate-700">/</span>
              {t.today.synced} {formatSyncTime(row.synced_at)}
            </p>
          )
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        {row ? (
          <div className="space-y-10">
            <VerdictBand
              userName={firstName}
              focusScore={row.focus_score}
              productiveSeconds={row.productive_seconds}
              distractionSeconds={row.distraction_seconds}
              neutralSeconds={row.neutral_seconds}
              uncategorizedSeconds={row.uncategorized_seconds}
            />

            <DailyInsight
              analysisText={todaysAi?.analysis_text ?? null}
              todayDate={todayDate}
              language={language}
            />

            <SiteRanking
              heading={t.today.whereTimeWent}
              sites={row.top_domains ?? []}
              emptyLabel={t.today.noData}
              total={formatDuration(
                (row.top_domains ?? []).reduce((sum, d) => sum + d.seconds, 0),
              )}
            />
          </div>
        ) : (
          <div className="max-w-md border-t border-slate-800/80 pt-10">
            <Inbox size={28} strokeWidth={1.5} className="text-slate-600" />
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-slate-200">
              {t.today.noSyncedData}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{t.today.noSyncedDesc}</p>
          </div>
        )}
      </main>
    </>
  )
}
