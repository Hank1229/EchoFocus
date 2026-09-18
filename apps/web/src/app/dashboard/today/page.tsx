import { redirect } from 'next/navigation'
import { Inbox } from 'lucide-react'
import {
  STREAK_WINDOW_DAYS,
  calculateStreak,
  canGenerateDailyInsight,
  formatDuration,
  getTodayDateString,
} from '@echofocus/shared'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import VerdictBand from './VerdictBand'
import DailyInsight from './DailyInsight'
import SiteRanking, { type RankedSite } from './SiteRanking'
import DateNav from './DateNav'

function isValidDateString(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

// How far the date arrows can walk back. Wider than the streak window on
// purpose: the streak only needs recent history, the nav should reach the whole
// archive.
const DATE_NAV_WINDOW_DAYS = 365

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

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const supabase = await createClient()
  const { t, language } = await getLocale()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Available dates drive the prev/next nav; the newest one is also the
  // fallback "current" date when no (or an invalid) ?date= is given.
  const [{ data: availableRows, error: historyError }, { data: prefs }] = await Promise.all([
    supabase
      .from('synced_aggregates')
      .select('date, productive_seconds')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(DATE_NAV_WINDOW_DAYS),
    supabase
      .from('user_preferences')
      .select('daily_goal_minutes')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const availableDates = (availableRows ?? []).map(r => r.date as string)
  const requestedDate = isValidDateString(dateParam) ? dateParam : null
  const displayDate = requestedDate ?? availableDates[0] ?? getTodayDateString()

  // Anchor the streak on the day being shown, never the server clock — this
  // server renders in UTC while the data is keyed to the user's local days.
  const goalMinutes = (prefs?.daily_goal_minutes as number | undefined) ?? 360
  // Only the streak window feeds the streak — the date list above reaches
  // further back so the nav arrows do not dead-end at 90 days.
  const streak = calculateStreak(
    (availableRows ?? []).slice(0, STREAK_WINDOW_DAYS).map(r => ({
      date: r.date as string,
      productiveSeconds: r.productive_seconds as number,
    })),
    goalMinutes,
    displayDate,
  )

  const [{ data, error: dayError }, { data: aiData }] = await Promise.all([
    supabase
      .from('synced_aggregates')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', displayDate)
      .maybeSingle(),
    // Weekly summaries are stored under their last day's date, so without the
    // type filter this would match two rows and maybeSingle() would return null.
    supabase
      .from('ai_analyses')
      .select('date, analysis_text, focus_score, created_at')
      .eq('user_id', user.id)
      .eq('date', displayDate)
      .eq('type', 'daily')
      .maybeSingle(),
  ])

  const row = data as SyncedRow | null
  const todaysAi = aiData as AiAnalysisRow | null
  // A failed query and an empty account are not the same thing, and the empty
  // state says "nothing synced yet" — which would be a lie about a 500.
  const loadError = historyError ?? dayError

  // Dates are sorted newest-first: an older day sits at a higher index, a
  // newer one at a lower index. A date outside the available list (e.g. a
  // hand-typed ?date= with no synced row) has no known neighbours.
  const currentIndex = availableDates.indexOf(displayDate)
  const prevDate = currentIndex === -1 ? null : availableDates[currentIndex + 1] ?? null
  const nextDate = currentIndex <= 0 ? null : availableDates[currentIndex - 1] ?? null

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

  return (
    <>
      <DashboardHeader
        title={t.today.title}
        userEmail={user?.email ?? undefined}
        avatarUrl={user?.user_metadata?.avatar_url as string | undefined}
        context={
          <DateNav
            label={formatDate(displayDate)}
            syncedLabel={row ? `${t.today.synced} ${formatSyncTime(row.synced_at)}` : null}
            prevHref={prevDate ? `/dashboard/today?date=${prevDate}` : null}
            nextHref={nextDate ? `/dashboard/today?date=${nextDate}` : null}
            prevAriaLabel={t.today.previousDay}
            nextAriaLabel={t.today.nextDay}
          />
        }
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        {loadError ? (
          <p role="alert" className="max-w-xl rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
            {t.common.loadFailed}{loadError.message}
          </p>
        ) : row ? (
          <div className="space-y-10">
            <VerdictBand
              userName={firstName}
              streak={streak}
              focusScore={row.focus_score}
              productiveSeconds={row.productive_seconds}
              distractionSeconds={row.distraction_seconds}
              neutralSeconds={row.neutral_seconds}
              uncategorizedSeconds={row.uncategorized_seconds}
            />

            <DailyInsight
              analysisText={todaysAi?.analysis_text ?? null}
              date={displayDate}
              canGenerate={canGenerateDailyInsight(displayDate)}
              language={language}
            />

            <SiteRanking
              heading={t.today.whereTimeWent}
              sites={row.top_domains ?? []}
              emptyLabel={t.today.noData}
              total={formatDuration(row.total_seconds)}
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
