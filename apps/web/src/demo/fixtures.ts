// One fixture week shared by /demo, the /dev/preview harness and the Guide's
// demo card. The demo day is written site by site and every other figure is
// worked out from it, so Today, Trends, the insight and the popup screenshot
// agree; fixtures.test.ts holds them to it. No imports: the popup capture in
// tests/visual reads this file outside the Next build.

type Category = 'productive' | 'distraction' | 'neutral'

export const PREVIEW_TODAY = '2026-09-18'

export const TODAY_SITES: Array<{ domain: string; seconds: number; category: Category }> = [
  { domain: 'github.com', seconds: 10440, category: 'productive' },
  { domain: 'claude.ai', seconds: 7380, category: 'productive' },
  { domain: 'youtube.com', seconds: 4620, category: 'distraction' },
  { domain: 'docs.google.com', seconds: 2760, category: 'productive' },
  { domain: 'news.ycombinator.com', seconds: 1980, category: 'distraction' },
  { domain: 'gmail.com', seconds: 1560, category: 'neutral' },
  { domain: 'stackoverflow.com', seconds: 1320, category: 'productive' },
  { domain: 'wikipedia.org', seconds: 840, category: 'neutral' },
  { domain: 'figma.com', seconds: 780, category: 'productive' },
  { domain: 'reddit.com', seconds: 540, category: 'distraction' },
]

// When the day's productive time fell, as weights per hour; the real minutes
// come from spreadOverHours.
const TODAY_SHAPE = [
  0, 0, 0, 0, 0, 0, 0, 420,
  2340, 3120, 2760, 1980, 540, 1260, 2880, 3540,
  3060, 1740, 660, 0, 900, 480, 0, 0,
]

const WEEK_SHAPE = [
  0, 0, 0, 0, 0, 0, 1200, 4800,
  14400, 18900, 16200, 12600, 4200, 8400, 17400, 20700,
  18000, 10800, 4500, 1800, 5400, 2700, 600, 0,
]

// The extension's formula (calculateFocusScore in packages/shared).
function focusScore(productive: number, distraction: number): number {
  return Math.min(100, Math.round((productive / (productive + distraction)) * 100))
}

function day(date: string, productive: number, distraction: number, neutral: number) {
  return { date, productive, distraction, neutral, score: focusScore(productive, distraction) }
}

const secondsIn = (category: Category) =>
  TODAY_SITES.filter(site => site.category === category).reduce((total, site) => total + site.seconds, 0)

export const TODAY_ROW = day(PREVIEW_TODAY, secondsIn('productive'), secondsIn('distraction'), secondsIn('neutral'))

export const WEEK = [
  day('2026-09-12', 16920, 12240, 2280),
  day('2026-09-13', 21180, 8640, 1860),
  day('2026-09-14', 9480, 14820, 3120),
  day('2026-09-15', 18660, 10500, 2640),
  day('2026-09-16', 23400, 6600, 1980),
  day('2026-09-17', 20160, 9060, 2400),
  TODAY_ROW,
]

// Whole minutes per hour in proportion to `shape`, adding up to exactly
// `totalSeconds` (largest remainder), so a chart never disagrees with its total.
export function spreadOverHours(totalSeconds: number, shape: number[]): number[] {
  const minutes = Math.round(totalSeconds / 60)
  const weight = shape.reduce((sum, w) => sum + w, 0)
  const exact = shape.map(w => (w / weight) * minutes)
  const spread = exact.map(Math.floor)
  const short = minutes - spread.reduce((sum, m) => sum + m, 0)
  exact
    .map((value, hour) => ({ hour, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, short)
    .forEach(({ hour }) => { spread[hour] += 1 })
  return spread.map(m => m * 60)
}

export const TODAY_HOURS = spreadOverHours(TODAY_ROW.productive, TODAY_SHAPE)

export const WEEK_HOURS = spreadOverHours(WEEK.reduce((sum, d) => sum + d.productive, 0), WEEK_SHAPE)

export const PREVIEW_USER = {
  id: '00000000-0000-4000-8000-000000000000',
  email: 'demo@echofocus.dev',
  fullName: 'Demo User',
}

export const PREVIEW_RULES = [
  { id: 'rule-1', pattern: 'youtube.com/playlist', match_type: 'path' as const, category: 'productive' as const },
  { id: 'rule-2', pattern: '*.notion.site', match_type: 'wildcard' as const, category: 'productive' as const },
  { id: 'rule-3', pattern: 'news.ycombinator.com', match_type: 'exact' as const, category: 'distraction' as const },
]

// Fixture insights in the voice DESIGN.md section 9 sets for the real ones:
// the numbers, what they show, one concrete suggestion. Every figure is the
// fixture day's; fixtures.test.ts checks them.
export const DAILY_INSIGHT = {
  en: `You tracked 8h 57m today with a focus score of 76. Productive time came to 6h 18m, and the strongest stretch ran from 14:00 to 17:00.

The morning ramped up more slowly: 34 productive minutes in the 08:00 hour against 52 in the 15:00 hour. Breaks and browsing came to 1h 59m.

Tomorrow, try starting your first focus block right at 08:00 to bring the morning closer to the afternoon.`,
  'zh-TW': `今天共追蹤 8 小時 57 分，專注分數 76。生產力時間 6 小時 18 分，最集中的一段落在 14:00 到 17:00。

上午進入狀態比較慢：08:00 那一小時有 34 分鐘生產力時間，15:00 則有 52 分鐘。休息與瀏覽共 1 小時 59 分。

明天可以在 08:00 一開始就進入第一段專注，讓上午更接近下午的狀態。`,
}

// The same voice as the real weekly review; figures match WEEK and WEEK_HOURS.
export const WEEKLY_REVIEW = {
  en: `Your average focus score this week was 65, and three of the seven days reached the 70-point target. The lowest day was Sep 14 at 39, when breaks and browsing took more time than productive work.

Next week, keep 09:00 to 10:00 for focused work. It was one of your three strongest hours.`,
  'zh-TW': `這週平均專注分數 65，七天中有三天達到 70 分目標。最低的是 9/14 的 39 分，那天休息與瀏覽的時間比生產力時間還多。

下週可以把 09:00 到 10:00 留給專注工作，這是你最專注的三個時段之一。`,
}
