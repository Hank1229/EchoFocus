import type { InsightLanguage } from './insight-language'

// The AI quotas reset on UTC boundaries (ai-analyze's quota functions): the
// daily one at UTC midnight, the weekly one at Monday 00:00 UTC. That is
// 7 PM in Chicago and 8 AM in Taipei, so "tomorrow" is wrong for many
// people; the copy names the moment in the reader's own time instead.

export function nextDailyReset(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
}

export function nextWeeklyReset(now: Date): Date {
  const daysToMonday = (8 - now.getUTCDay()) % 7 || 7
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMonday))
}

const ZH_WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function clock(date: Date): string {
  return `${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')}`
}

function zhPeriod(hour: number): string {
  if (hour < 5) return '凌晨'
  if (hour < 12) return '早上'
  if (hour < 13) return '中午'
  if (hour < 18) return '下午'
  return '晚上'
}

function localDayOffset(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

// 下週 means the next Monday-to-Sunday week, not seven days on: said on a
// Wednesday, the coming Monday is 下週一.
function inNextWeek(from: Date, offset: number): boolean {
  const daysSinceMonday = (from.getDay() + 6) % 7
  return daysSinceMonday + offset >= 7
}

// When a reset happens, in the browser's zone, worded relative to now:
// "今晚 7:00", "明天早上 8:00", "下週一早上 8:00" / "7:00 PM tonight",
// "8:00 AM tomorrow", "8:00 AM on Monday".
export function resetPhrase(reset: Date, now: Date, language: InsightLanguage): string {
  const hour = reset.getHours()
  const offset = localDayOffset(now, reset)
  const weekday = reset.getDay()
  if (language === 'zh-TW') {
    const time = `${zhPeriod(hour)} ${clock(reset)}`
    if (offset === 0) return hour >= 18 ? `今晚 ${clock(reset)}` : `今天${time}`
    if (offset === 1) return `明天${time}`
    return `${inNextWeek(now, offset) ? '下' : ''}${ZH_WEEKDAYS[weekday]}${time}`
  }
  const time = `${clock(reset)} ${hour < 12 ? 'AM' : 'PM'}`
  if (offset === 0) return hour >= 18 ? `${time} tonight` : `${time} today`
  if (offset === 1) return `${time} tomorrow`
  return `${time} ${offset >= 7 ? 'next' : 'on'} ${EN_WEEKDAYS[weekday]}`
}
