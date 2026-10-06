// The header's day, e.g. "Friday, September 18" or "9月18日星期五". The date
// is read and formatted in the same zone, so the weekday holds wherever the
// code runs.
export function dayLabel(date: string, locale: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// The day the header names: the one asked for, else the newest synced day.
// null while the account has no synced day: the browser then names its own
// today, because this server's clock runs in UTC and before 08:00 in Taipei
// it still says yesterday.
export function headerDate(requested: string | null, available: string[]): string | null {
  return requested ?? available[0] ?? null
}
