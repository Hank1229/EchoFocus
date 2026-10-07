import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import TrendsView from '../../../dashboard/trends/TrendsView'
import WeeklyReview from '../../../dashboard/trends/WeeklyReview'
import { shortDate } from '../../../dashboard/trends/short-date'
import { WEEK } from '../fixtures'

// Design-review harness for the Trends page. Dev only — production 404s.

// The same voice as the real weekly review; figures match WEEK and HOURS.
const WEEKLY = {
  en: `Your average focus score this week was 65, and three of the seven days reached the 70-point target. The lowest day was Sep 14 at 39, when breaks and browsing took more time than productive work.

Next week, keep 09:00 to 10:00 for focused work. It was one of your three strongest hours.`,
  'zh-TW': `這週平均專注分數 65，七天中有三天達到 70 分目標。最低的是 9/14 的 39 分，那天休息與瀏覽的時間比生產力時間還多。

下週可以把 09:00 到 10:00 留給專注工作，這是你最專注的三個時段之一。`,
}

const HOURS = [
  0, 0, 0, 0, 0, 0, 1200, 4800,
  14400, 18900, 16200, 12600, 4200, 8400, 17400, 20700,
  18000, 10800, 4500, 1800, 5400, 2700, 600, 0,
]

// ?review=other shows the weekly review written in the other language.
export default async function TrendsPreviewPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { t, language } = await getLocale()
  const { review } = await searchParams
  const reviewLanguage = (review === 'other') !== (language === 'zh-TW') ? 'zh-TW' : 'en'

  const totalProductive = WEEK.reduce((s, d) => s + d.productive, 0)
  const totalBreaks = WEEK.reduce((s, d) => s + d.distraction, 0)
  const avgScore = Math.round(WEEK.reduce((s, d) => s + d.score, 0) / WEEK.length)

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={t.trends.title}
          userEmail="preview@echofocus.dev"
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
            bestDay={{ label: shortDate('2026-09-16', language), score: 78 }}
            hours={HOURS}
            barData={WEEK.map(({ date, productive, distraction, neutral }) => ({ date: shortDate(date, language), productive, distraction, neutral }))}
            scoreData={WEEK.map(({ date, score }) => ({ date: shortDate(date, language), score }))}
            copy={t.trends}
            neutralLabel={t.today.neutral}
          />
          <div className="mt-10"><WeeklyReview initialText={WEEKLY[reviewLanguage]} language={language} /></div>
        </main>
      </div>
    </div>
  )
}
