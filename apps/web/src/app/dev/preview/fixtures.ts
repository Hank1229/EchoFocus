import { calculateStreak, DEFAULT_SETTINGS } from '@echofocus/shared'

// One fixture week shared by every dashboard preview, so Today, Trends and
// Settings agree with each other and with the extension's defaults.

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

// The streak Today shows, worked out the way the real page does: days whose
// productive time reached the default daily goal, counted back from today.
export const STREAK = calculateStreak(
  WEEK.map(day => ({ date: day.date, productiveSeconds: day.productive })),
  DEFAULT_SETTINGS.dailyGoalMinutes,
  PREVIEW_TODAY,
)
