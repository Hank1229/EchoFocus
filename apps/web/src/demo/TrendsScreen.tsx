import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import TrendsView from '../app/dashboard/trends/TrendsView'
import WeeklyReview from '../app/dashboard/trends/WeeklyReview'
import { shortDate } from '../app/dashboard/trends/short-date'
import { PREVIEW_USER, WEEK, WEEK_HOURS, WEEKLY_REVIEW } from './fixtures'

// The Trends page on the fixture week, for /demo and /dev/preview.
// `reviewInOtherLanguage` shows the weekly review written in the other language.
export default async function TrendsScreen({ reviewInOtherLanguage = false }: { reviewInOtherLanguage?: boolean }) {
  const { t, language } = await getLocale()
  const reviewLanguage = reviewInOtherLanguage !== (language === 'zh-TW') ? 'zh-TW' : 'en'

  const totalProductive = WEEK.reduce((s, d) => s + d.productive, 0)
  const totalBreaks = WEEK.reduce((s, d) => s + d.distraction, 0)
  const avgScore = Math.round(WEEK.reduce((s, d) => s + d.score, 0) / WEEK.length)
  const best = WEEK.reduce((top, d) => (d.score > top.score ? d : top))

  return (
    <>
      <DashboardHeader
        title={t.trends.title}
        userEmail={PREVIEW_USER.email}
        context={
          <div className="flex items-center gap-1 rounded-md border border-line p-0.5">
            <span className="rounded bg-accent-subtle px-3 py-1 text-caption font-medium text-accent">{t.trends.last7days}</span>
            <span className="px-3 py-1 text-caption font-medium text-content-secondary">{t.trends.last30days}</span>
          </div>
        }
      />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-8">
        <TrendsView
          days={7}
          avgScore={avgScore}
          daysTracked={7}
          totalProductive={totalProductive}
          totalBreaks={totalBreaks}
          bestDay={{ label: shortDate(best.date, language), score: best.score }}
          hours={WEEK_HOURS}
          barData={WEEK.map(({ date, productive, distraction, neutral }) => ({ date: shortDate(date, language), productive, distraction, neutral }))}
          scoreData={WEEK.map(({ date, score }) => ({ date: shortDate(date, language), score }))}
          copy={t.trends}
          neutralLabel={t.today.neutral}
        />
        <div className="mt-10"><WeeklyReview key={language} initialText={WEEKLY_REVIEW[reviewLanguage]} language={language} /></div>
      </main>
    </>
  )
}
