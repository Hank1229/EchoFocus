import type { DailyAggregate, StreakDay } from '@echofocus/shared'
import { calculateStreak, formatDuration, getDateNDaysAgo, STREAK_WINDOW_DAYS } from '@echofocus/shared'
import { getSettings } from './storage'
import { DASHBOARD_URL } from '../lib/config'
import en from '../locales/en.json'
import zhTW from '../locales/zh-TW.json'

// The enabled flag lives in its own storage key rather than inside `settings`:
// settingsSchema (and the SAVE_SETTINGS payload schema) strip unknown keys, so
// a flag added to that object would be dropped on the next read.
const ENABLED_KEY = 'daily_summary_notifications'
const LAST_SENT_KEY = 'daily_summary_sent_on'

const NOTIFICATION_ID = 'echofocus-daily-summary'
const ICON_PATH = 'src/assets/icon-128.png'

// A one-day streak is just "today" — not worth a sentence.
const MIN_STREAK_TO_MENTION = 2


export async function isDailySummaryEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get(ENABLED_KEY)
  return stored[ENABLED_KEY] === true
}

export async function setDailySummaryEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled })
}

// Raised by the 21:00 alarm. Returns whether a notification actually went out —
// every false is a deliberate gate, not a failure.
export async function notifyDailySummary(date: string, aggregate: DailyAggregate): Promise<boolean> {
  if (!(await isDailySummaryEnabled())) return false
  if (aggregate.totalSeconds === 0) return false

  const settings = await getSettings()
  if (!settings.trackingEnabled) return false

  const stored = await chrome.storage.local.get(LAST_SENT_KEY)
  if (stored[LAST_SENT_KEY] === date) return false

  const streak = await streakEndingOn(date, aggregate.productiveSeconds, settings.dailyGoalMinutes)
  const copy = await summaryCopy()
  const productive = formatDuration(aggregate.productiveSeconds)

  chrome.notifications.create(NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL(ICON_PATH),
    title: copy.title.replace('{score}', String(aggregate.focusScore)),
    message:
      streak >= MIN_STREAK_TO_MENTION
        ? copy.messageWithStreak.replace('{time}', productive).replace('{n}', String(streak))
        : copy.message.replace('{time}', productive),
  })

  await chrome.storage.local.set({ [LAST_SENT_KEY]: date })
  return true
}

// chrome.action.openPopup() needs a user gesture in the worker, which a
// notification click does not provide, so the click opens the web dashboard.
export async function openDailySummary(notificationId: string): Promise<void> {
  if (notificationId !== NOTIFICATION_ID) return
  chrome.notifications.clear(notificationId)
  await chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/today` })
}

async function streakEndingOn(
  date: string,
  productiveSeconds: number,
  goalMinutes: number,
): Promise<number> {
  const dates = Array.from({ length: STREAK_WINDOW_DAYS }, (_, i) => getDateNDaysAgo(i))
  const stored = await chrome.storage.local.get(dates.map(d => `aggregates:${d}`))

  // The stored aggregate for today lags the live session, so the caller's
  // fresher total replaces it.
  const days: StreakDay[] = dates
    .filter(d => d !== date)
    .flatMap(d => {
      const aggregate = stored[`aggregates:${d}`] as DailyAggregate | undefined
      return aggregate ? [{ date: d, productiveSeconds: aggregate.productiveSeconds }] : []
    })

  return calculateStreak([...days, { date, productiveSeconds }], goalMinutes, date).current
}

async function summaryCopy(): Promise<typeof en.notifications.dailySummary> {
  const { language } = await chrome.storage.local.get('language')
  const locale = language === 'zh-TW' ? (zhTW as typeof en) : en
  return locale.notifications.dailySummary
}
