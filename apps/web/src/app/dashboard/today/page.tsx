import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import { redirect } from 'next/navigation'
import { formatDuration, getTodayDateString } from '@echofocus/shared'
import { Zap, Coffee, Minus } from 'lucide-react'
import { getLocale } from '@/lib/i18n-server'
import GreetingHero from './GreetingHero'
import FocusTimeline from './FocusTimeline'
import AiInsightInteractiveCard from './AiInsightInteractiveCard'

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  }

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const CATEGORY_LABELS = {
    productive: t.categoryLabels.productive,
    distraction: t.categoryLabels.distraction,
    neutral: t.categoryLabels.neutral,
    uncategorized: t.categoryLabels.uncategorized,
  }

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? ''
  // Use the displayed aggregate's own date so the AI card queries/regenerates
  // the same day the page is showing (extension keys dates in the USER's local
  // time; this server renders in UTC, so never derive "today" here).
  const todayDate = row?.date ?? getTodayDateString()
  // latestAi is the newest analysis for ANY date — only show it on this card
  // when it actually belongs to the displayed day, otherwise a stale insight
  // gets presented as today's.
  const todaysAi = latestAi?.date === todayDate ? latestAi : null

  return (
    <>
      <DashboardHeader title={t.today.title} userEmail={user?.email ?? undefined} avatarUrl={user?.user_metadata?.avatar_url as string | undefined} />

      <main className="flex-1 px-6 py-8 space-y-6">
        {row ? (
          <>
            {/* Date + sync info */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">{formatDate(row.date)}</p>
              <p className="text-xs text-slate-600">{t.today.synced} {formatSyncTime(row.synced_at)}</p>
            </div>

            {/* MACRO: Greeting hero */}
            <GreetingHero
              userName={firstName}
              productiveSeconds={row.productive_seconds}
              focusScore={row.focus_score}
            />

            {/* MACRO: Focus timeline */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
                {t.today.focusTimeline}
              </p>
              <FocusTimeline
                productiveSeconds={row.productive_seconds}
                distractionSeconds={row.distraction_seconds}
                neutralSeconds={row.neutral_seconds}
                uncategorizedSeconds={row.uncategorized_seconds}
                topDomains={row.top_domains}
              />
            </div>

            {/* MICRO: Detail grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Sites — 7 cols */}
              <div className="lg:col-span-7 col-span-12">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">{t.today.todaysSites}</p>
                  {row.top_domains.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.today.noData}</p>
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

              {/* AI Insight — 5 cols */}
              <div className="lg:col-span-5 col-span-12">
                <AiInsightInteractiveCard
                  analysisText={todaysAi?.analysis_text ?? null}
                  todayDate={todayDate}
                  language={language}
                />
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">📭</p>
            <h2 className="text-xl font-bold text-slate-300 mb-2">{t.today.noSyncedData}</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              {t.today.noSyncedDesc}
            </p>
          </div>
        )}
      </main>
    </>
  )
}
