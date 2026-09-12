import { useEffect, useState } from 'react'
import type { DailyAggregate, Settings, Streak, StreakDay } from '@echofocus/shared'
import { DEFAULT_SETTINGS, calculateStreak, getDateNDaysAgo, getTodayDateString } from '@echofocus/shared'

// Two months of history is enough for any streak worth showing and keeps the
// read to a single batched storage call.
const WINDOW_DAYS = 60

// Today's stored aggregate lags the live session, so the caller passes the
// live productive total and it replaces whatever is on disk for today.
export function useStreak(todayProductiveSeconds: number): Streak | null {
  const [history, setHistory] = useState<StreakDay[] | null>(null)
  const [goalMinutes, setGoalMinutes] = useState(DEFAULT_SETTINGS.dailyGoalMinutes)

  useEffect(() => {
    const load = async () => {
      const dates = Array.from({ length: WINDOW_DAYS }, (_, i) => getDateNDaysAgo(i))
      const stored = await chrome.storage.local.get([...dates.map(date => `aggregates:${date}`), 'settings'])

      const settings = { ...DEFAULT_SETTINGS, ...(stored.settings as Partial<Settings> | undefined) }
      setGoalMinutes(settings.dailyGoalMinutes)

      setHistory(dates.flatMap(date => {
        const aggregate = stored[`aggregates:${date}`] as DailyAggregate | undefined
        return aggregate ? [{ date, productiveSeconds: aggregate.productiveSeconds }] : []
      }))
    }
    void load()
  }, [])

  if (!history) return null

  const today = getTodayDateString()
  const days = [
    ...history.filter(day => day.date !== today),
    { date: today, productiveSeconds: todayProductiveSeconds },
  ]

  return calculateStreak(days, goalMinutes, today)
}
