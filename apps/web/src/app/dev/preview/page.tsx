import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import DayWaveform from '@/components/dashboard/DayWaveform'
import TodayReview from '../../dashboard/today/TodayReview'
import SiteRanking from '../../dashboard/today/SiteRanking'
import DateNav from '../../dashboard/today/DateNav'
import { dayLabel } from '../../dashboard/today/day-label'
import { PREVIEW_TODAY, STREAK, TODAY_ROW } from './fixtures'

// Design-review harness: the Today page with fixture data and no auth, so the
// dashboard can be screenshotted and iterated on without a signed-in session.
// Dev only — production 404s.

const HOURS = [
  0, 0, 0, 0, 0, 0, 0, 420,
  2340, 3120, 2760, 1980, 540, 1260, 2880, 3540,
  3060, 1740, 660, 0, 900, 480, 0, 0,
]

const SITES = [
  { domain: 'github.com', seconds: 9240, category: 'productive' as const },
  { domain: 'claude.ai', seconds: 6180, category: 'productive' as const },
  { domain: 'youtube.com', seconds: 3420, category: 'distraction' as const },
  { domain: 'docs.google.com', seconds: 2760, category: 'productive' as const },
  { domain: 'news.ycombinator.com', seconds: 1980, category: 'distraction' as const },
  { domain: 'gmail.com', seconds: 1560, category: 'neutral' as const },
  { domain: 'stackoverflow.com', seconds: 1320, category: 'productive' as const },
  { domain: 'wikipedia.org', seconds: 840, category: 'neutral' as const },
  { domain: 'figma.com', seconds: 780, category: 'productive' as const },
  { domain: 'reddit.com', seconds: 540, category: 'distraction' as const },
]

// Fixture insights in the voice DESIGN.md section 9 sets for the real ones:
// the numbers, what they show, one concrete suggestion. Figures match the
// fixture day below.
const INSIGHT = {
  en: `You tracked 8h 37m today with a focus score of 76. Productive time came to 6h 18m, and the strongest stretch ran from 14:00 to 17:00.

The morning ramped up more slowly: 39 productive minutes in the 08:00 hour against 59 in the 15:00 hour. Breaks and browsing came to 1h 39m.

Tomorrow, try starting your first focus block right at 08:00 to bring the morning closer to the afternoon.`,
  'zh-TW': `今天共追蹤 8 小時 37 分，專注分數 76。生產力時間 6 小時 18 分，最集中的一段落在 14:00 到 17:00。

上午進入狀態比較慢：08:00 那一小時有 39 分鐘生產力時間，15:00 則有 59 分鐘。休息與瀏覽共 1 小時 39 分。

明天可以在 08:00 一開始就進入第一段專注，讓上午更接近下午的狀態。`,
}

export default async function PreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const { t, language } = await getLocale()

  const { productive, distraction, neutral } = TODAY_ROW

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={t.today.title}
          userEmail="preview@echofocus.dev"
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
            <TodayReview
              totalSeconds={productive + distraction + neutral}
              focusScore={TODAY_ROW.score}
              productiveSeconds={productive}
              distractionSeconds={distraction}
              neutralSeconds={neutral}
              uncategorizedSeconds={0}
              streak={STREAK}
              analysisText={language === 'zh-TW' ? INSIGHT['zh-TW'] : INSIGHT.en}
              date={PREVIEW_TODAY}
              canGenerate
              language={language}
            />
            <section>
              <h2 className="text-label text-content-secondary">{t.today.focusByHour}</h2>
              <div className="mt-3">
                <DayWaveform hours={HOURS} label={t.today.focusByHour} />
              </div>
            </section>
            <SiteRanking
              heading={t.today.whereTimeWent}
              sites={SITES}
              emptyLabel={t.today.noData}
              total="8h 39m"
            />
          </div>
        </main>
      </div>
    </div>
  )
}
