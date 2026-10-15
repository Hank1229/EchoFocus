// One fixture week shared by /demo and the /dev/preview harness, so Today,
// Trends and Settings agree with each other and with the extension's defaults.
// No imports: the visual suite reads this file outside the Next build.

export const PREVIEW_TODAY = '2026-09-18'

export const WEEK = [
  { date: '2026-09-12', productive: 16920, distraction: 7020, neutral: 2280, score: 58 },
  { date: '2026-09-13', productive: 21180, distraction: 4920, neutral: 1860, score: 71 },
  { date: '2026-09-14', productive: 9480, distraction: 10440, neutral: 3120, score: 39 },
  { date: '2026-09-15', productive: 18660, distraction: 5580, neutral: 2640, score: 64 },
  { date: '2026-09-16', productive: 23400, distraction: 4020, neutral: 1980, score: 78 },
  { date: '2026-09-17', productive: 20160, distraction: 6120, neutral: 2400, score: 69 },
  { date: '2026-09-18', productive: 22680, distraction: 5940, neutral: 2400, score: 76 },
]

export const TODAY_ROW = WEEK[WEEK.length - 1]

export const TODAY_HOURS = [
  0, 0, 0, 0, 0, 0, 0, 420,
  2340, 3120, 2760, 1980, 540, 1260, 2880, 3540,
  3060, 1740, 660, 0, 900, 480, 0, 0,
]

export const TODAY_SITES = [
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

export const WEEK_HOURS = [
  0, 0, 0, 0, 0, 0, 1200, 4800,
  14400, 18900, 16200, 12600, 4200, 8400, 17400, 20700,
  18000, 10800, 4500, 1800, 5400, 2700, 600, 0,
]

export const PREVIEW_USER = {
  id: '00000000-0000-4000-8000-000000000000',
  email: 'preview@echofocus.dev',
  fullName: 'Preview User',
}

export const PREVIEW_RULES = [
  { id: 'rule-1', pattern: 'youtube.com/playlist', match_type: 'path' as const, category: 'productive' as const },
  { id: 'rule-2', pattern: '*.notion.site', match_type: 'wildcard' as const, category: 'productive' as const },
  { id: 'rule-3', pattern: 'news.ycombinator.com', match_type: 'exact' as const, category: 'distraction' as const },
]

// Fixture insights in the voice DESIGN.md section 9 sets for the real ones:
// the numbers, what they show, one concrete suggestion. Figures match the
// fixture day above.
export const DAILY_INSIGHT = {
  en: `You tracked 8h 37m today with a focus score of 76. Productive time came to 6h 18m, and the strongest stretch ran from 14:00 to 17:00.

The morning ramped up more slowly: 39 productive minutes in the 08:00 hour against 59 in the 15:00 hour. Breaks and browsing came to 1h 39m.

Tomorrow, try starting your first focus block right at 08:00 to bring the morning closer to the afternoon.`,
  'zh-TW': `今天共追蹤 8 小時 37 分，專注分數 76。生產力時間 6 小時 18 分，最集中的一段落在 14:00 到 17:00。

上午進入狀態比較慢：08:00 那一小時有 39 分鐘生產力時間，15:00 則有 59 分鐘。休息與瀏覽共 1 小時 39 分。

明天可以在 08:00 一開始就進入第一段專注，讓上午更接近下午的狀態。`,
}

// The same voice as the real weekly review; figures match WEEK and WEEK_HOURS.
export const WEEKLY_REVIEW = {
  en: `Your average focus score this week was 65, and three of the seven days reached the 70-point target. The lowest day was Sep 14 at 39, when breaks and browsing took more time than productive work.

Next week, keep 09:00 to 10:00 for focused work. It was one of your three strongest hours.`,
  'zh-TW': `這週平均專注分數 65，七天中有三天達到 70 分目標。最低的是 9/14 的 39 分，那天休息與瀏覽的時間比生產力時間還多。

下週可以把 09:00 到 10:00 留給專注工作，這是你最專注的三個時段之一。`,
}
