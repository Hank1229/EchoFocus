// Day labels on the Trends charts and the best-day stat: "Sep 12" in English,
// "9/12" in zh-TW. Dates are the user's local calendar days, so they are
// read as local midnight rather than UTC.
export function shortDate(date: string, language: string): string {
  const day = new Date(date + 'T00:00:00')
  return language === 'zh-TW'
    ? day.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    : day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
