import { formatLocalDate } from './aggregate'

export interface StreakDay {
  date: string            // YYYY-MM-DD, user-local
  productiveSeconds: number
}

export interface Streak {
  current: number
  best: number
}

// Step back one local day from a YYYY-MM-DD string. Day 0 of a month rolls
// into the previous month, so no month-length table is needed.
function previousDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return formatLocalDate(new Date(y, m - 1, d - 1))
}

// A day is "met" when its productive time reaches the daily goal.
// `current` counts back from today when today already met the goal, otherwise
// from yesterday — a day still in progress must not break the streak.
// `best` is the longest run anywhere in the given history.
export function calculateStreak(
  days: StreakDay[],
  goalMinutes: number,
  today: string,
): Streak {
  const goalSeconds = goalMinutes * 60
  const met = new Set(
    days.filter((day) => day.productiveSeconds >= goalSeconds).map((day) => day.date),
  )

  let current = 0
  let cursor = met.has(today) ? today : previousDate(today)
  while (met.has(cursor)) {
    current++
    cursor = previousDate(cursor)
  }

  let best = 0
  let run = 0
  for (const date of [...met].sort()) {
    run = met.has(previousDate(date)) ? run + 1 : 1
    best = Math.max(best, run)
  }

  return { current, best }
}
