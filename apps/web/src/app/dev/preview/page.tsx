import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import VerdictBand from '../../dashboard/today/VerdictBand'
import DailyInsight from '../../dashboard/today/DailyInsight'
import SiteRanking from '../../dashboard/today/SiteRanking'
import DateNav from '../../dashboard/today/DateNav'

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

const INSIGHT = `You put together a genuinely strong day — 4 hours of focused work against a 6-and-a-half hour total, and your longest unbroken stretch landed between 14:00 and 16:00, right where your energy usually peaks.

The morning started slower: the first deep-work block didn't arrive until after 8, and a scattering of short visits before it suggests warm-up drift. Your breaks were well-shaped — most stayed under ten minutes and none derailed the block that followed.

One thing to try tomorrow: protect the 9-to-11 window the way you naturally protect mid-afternoon. If the morning matched the afternoon, days like this would be your baseline rather than your best.`

export default async function PreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const { t, language } = await getLocale()

  const productive = 22680
  const distraction = 5940
  const neutral = 2400

  return (
    <div className="relative flex min-h-screen bg-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(45,212,191,0.05),transparent)]"
      />
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={t.today.title}
          userEmail="preview@echofocus.dev"
          context={
            <DateNav
              label={language === 'zh-TW' ? '9月18日 星期四' : 'Thursday, September 18'}
              syncedLabel={`${t.today.synced} 21:02`}
              prevHref="#"
              nextHref={null}
              prevAriaLabel={t.today.previousDay}
              nextAriaLabel={t.today.nextDay}
            />
          }
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
          <div className="space-y-10">
            <div className="rise rise-1">
              <VerdictBand
                userName="Hank"
                streak={{ current: 6, best: 11 }}
                focusScore={76}
                productiveSeconds={productive}
                distractionSeconds={distraction}
                neutralSeconds={neutral}
                uncategorizedSeconds={0}
                productiveByHour={HOURS}
              />
            </div>
            <div className="rise rise-2">
              <DailyInsight analysisText={INSIGHT} date="2026-09-18" canGenerate language={language} />
            </div>
            <div className="rise rise-3">
              <SiteRanking
                heading={t.today.whereTimeWent}
                sites={SITES}
                emptyLabel={t.today.noData}
                total="8h 39m"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
