const DAY_MS = 86_400_000

// The ai-analyze Edge Function rejects a daily request whose date falls outside
// UTC today −2…+1 days. Mirroring that rule here — UTC on both sides, so the
// server and the browser agree — keeps the dashboard from offering a button the
// server is going to refuse.
export function canGenerateDailyInsight(date: string, now: Date = new Date()): boolean {
  const day = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(day)) return false
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return day >= today - 2 * DAY_MS && day <= today + DAY_MS
}
