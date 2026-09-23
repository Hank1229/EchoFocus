import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import TrendsView from '../../../dashboard/trends/TrendsView'
import WeeklyReview from '../../../dashboard/trends/WeeklyReview'

// Design-review harness for the Trends page. Dev only — production 404s.

const WEEK = [
  { date: 'Sep 12', productive: 16920, distraction: 7020, neutral: 2280, score: 58 },
  { date: 'Sep 13', productive: 21180, distraction: 4920, neutral: 1860, score: 71 },
  { date: 'Sep 14', productive: 9480, distraction: 10440, neutral: 3120, score: 39 },
  { date: 'Sep 15', productive: 18660, distraction: 5580, neutral: 2640, score: 64 },
  { date: 'Sep 16', productive: 23400, distraction: 4020, neutral: 1980, score: 78 },
  { date: 'Sep 17', productive: 20160, distraction: 6120, neutral: 2400, score: 69 },
  { date: 'Sep 18', productive: 22680, distraction: 5940, neutral: 2400, score: 76 },
]

const HOURS = [
  0, 0, 0, 0, 0, 0, 1200, 4800,
  14400, 18900, 16200, 12600, 4200, 8400, 17400, 20700,
  18000, 10800, 4500, 1800, 5400, 2700, 600, 0,
]

export default async function TrendsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const { t, language } = await getLocale()

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
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
          <TrendsView
            days={7}
            avgScore={avgScore}
            daysTracked={7}
            totalProductive={totalProductive}
            totalBreaks={totalBreaks}
            bestDay={{ label: 'Sep 16', score: 78 }}
            hours={HOURS}
            barData={WEEK.map(({ date, productive, distraction, neutral }) => ({ date, productive, distraction, neutral }))}
            scoreData={WEEK.map(({ date, score }) => ({ date, score }))}
            copy={t.trends}
            neutralLabel={t.today.neutral}
          />
          <div className="mt-10"><WeeklyReview initialText={"A steady week: four of your six tracked days crossed the goal line, and the strongest stretch landed midweek.\n\nOne suggestion: your Friday tail-off is where most of the lost time lives — shield one morning block there and the week evens out."} language={language} /></div>
        </main>
      </div>
    </div>
  )
}
