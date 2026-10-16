import { calculateStreak, DEFAULT_SETTINGS, formatDuration } from '@echofocus/shared'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import DayWaveform from '@/components/dashboard/DayWaveform'
import TodayReview from '../app/dashboard/today/TodayReview'
import SiteRanking from '../app/dashboard/today/SiteRanking'
import DateNav from '../app/dashboard/today/DateNav'
import { dayLabel } from '../app/dashboard/today/day-label'
import PopupShot from './PopupShot'
import { DAILY_INSIGHT, PREVIEW_TODAY, PREVIEW_USER, TODAY_HOURS, TODAY_ROW, TODAY_SITES, WEEK } from './fixtures'

// The streak Today shows, worked out the way the real page does: days whose
// productive time reached the default daily goal, counted back from today.
const STREAK = calculateStreak(
  WEEK.map(day => ({ date: day.date, productiveSeconds: day.productive })),
  DEFAULT_SETTINGS.dailyGoalMinutes,
  PREVIEW_TODAY,
)

// The Today page on fixture data, below the sidebar: rendered by /demo and by
// the /dev/preview harness. `insightInOtherLanguage` shows the insight written
// in the other language, the state that offers to regenerate it.
export default async function TodayScreen({ insightInOtherLanguage = false }: { insightInOtherLanguage?: boolean }) {
  const { t, language } = await getLocale()
  const insightLanguage = insightInOtherLanguage !== (language === 'zh-TW') ? 'zh-TW' : 'en'

  const { productive, distraction, neutral } = TODAY_ROW
  const totalSeconds = productive + distraction + neutral

  return (
    <>
      <DashboardHeader
        title={t.today.title}
        userEmail={PREVIEW_USER.email}
        context={
          <DateNav
            label={dayLabel(PREVIEW_TODAY, language === 'zh-TW' ? 'zh-TW' : 'en-US')}
            syncedAtIso="2026-09-18T13:02:00Z"
            syncedPrefix={t.today.synced}
            locale={language === 'zh-TW' ? 'zh-TW' : 'en-US'}
            prevHref="#"
            nextHref={null}
            prevAriaLabel={t.today.previousDay}
            nextAriaLabel={t.today.nextDay}
          />
        }
      />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-8">
        <div className="space-y-10">
          {/* Keyed so a language switch shows that language's sample, not a
              stale one offering to regenerate. */}
          <TodayReview
            key={language}
            totalSeconds={totalSeconds}
            focusScore={TODAY_ROW.score}
            productiveSeconds={productive}
            distractionSeconds={distraction}
            neutralSeconds={neutral}
            uncategorizedSeconds={0}
            streak={STREAK}
            analysisText={DAILY_INSIGHT[insightLanguage]}
            date={PREVIEW_TODAY}
            canGenerate
            language={language}
          />
          <section>
            <h2 className="text-label text-content-secondary">{t.today.focusByHour}</h2>
            <div className="mt-3">
              <DayWaveform hours={TODAY_HOURS} label={t.today.focusByHour} />
            </div>
          </section>
          <SiteRanking
            heading={t.today.whereTimeWent}
            sites={TODAY_SITES}
            emptyLabel={t.today.noData}
            total={formatDuration(totalSeconds)}
          />
          <PopupShot />
        </div>
      </main>
    </>
  )
}
