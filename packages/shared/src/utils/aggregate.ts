import type { TrackingEntry, DailyAggregate, TopDomain, Category } from '../types/tracking'
import { emptyProductiveByHour } from '../types/tracking'

// Calculate focus score (0-100) from productive and distraction seconds.
// Score = productive / (productive + distraction) * 100
// Returns 0 if no time tracked.
export function calculateFocusScore(
  productiveSeconds: number,
  distractionSeconds: number,
): number {
  const total = productiveSeconds + distractionSeconds
  if (total === 0) return 0
  return Math.min(100, Math.round((productiveSeconds / total) * 100))
}

// Spread one entry's duration over the local hours it covers, mirroring how
// splitEntryAtMidnight() spreads across days: every hour but the last is
// rounded, the last absorbs the remainder, so the buckets sum to exactly
// `seconds`. Local hours are read off the Date, so DST shifts follow the
// user's clock instead of a fixed 3600s stride.
function addToHours(buckets: number[], startTime: number, seconds: number): void {
  const end = startTime + seconds * 1000
  let segmentStart = startTime
  let allocated = 0

  while (segmentStart < end) {
    const nextHour = new Date(segmentStart)
    nextHour.setMinutes(60, 0, 0)
    const segmentEnd = Math.min(end, nextHour.getTime())
    const slice = segmentEnd >= end
      ? seconds - allocated
      : Math.round((segmentEnd - segmentStart) / 1000)
    allocated += slice
    buckets[new Date(segmentStart).getHours()] += slice
    segmentStart = segmentEnd
  }
}

// Aggregate an array of TrackingEntry records into a DailyAggregate.
export function aggregateEntries(
  entries: TrackingEntry[],
  date: string,
): DailyAggregate {
  const productiveByHour = emptyProductiveByHour()
  let productiveSeconds = 0
  let distractionSeconds = 0
  let neutralSeconds = 0
  let uncategorizedSeconds = 0

  const domainMap = new Map<string, { seconds: number; category: Category }>()

  for (const entry of entries) {
    const dur = Math.max(0, entry.duration)

    switch (entry.category) {
      case 'productive':
        productiveSeconds += dur
        addToHours(productiveByHour, entry.startTime, dur)
        break
      case 'distraction':
        distractionSeconds += dur
        break
      case 'neutral':
        neutralSeconds += dur
        break
      default:
        uncategorizedSeconds += dur
    }

    const existing = domainMap.get(entry.domain)
    if (existing) {
      existing.seconds += dur
    } else {
      domainMap.set(entry.domain, { seconds: dur, category: entry.category })
    }
  }

  const totalSeconds = productiveSeconds + distractionSeconds + neutralSeconds + uncategorizedSeconds

  const topDomains: TopDomain[] = [...domainMap.entries()]
    .map(([domain, { seconds, category }]) => ({ domain, seconds, category }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 10)

  return {
    date,
    totalSeconds,
    productiveSeconds,
    distractionSeconds,
    neutralSeconds,
    uncategorizedSeconds,
    topDomains,
    focusScore: calculateFocusScore(productiveSeconds, distractionSeconds),
    productiveByHour,
  }
}

// Format seconds into a human-readable string: "2h 34m" or "45m" or "30s"
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

// Format a Date as YYYY-MM-DD in the user's LOCAL timezone.
// Never use toISOString() for day bucketing — it converts to UTC and
// shifts entries into the wrong day for anyone not in UTC.
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Get today's date string in YYYY-MM-DD format (local timezone)
export function getTodayDateString(now: Date = new Date()): string {
  return formatLocalDate(now)
}

// Get YYYY-MM-DD string for N days ago (local timezone)
export function getDateNDaysAgo(n: number, now: Date = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return formatLocalDate(d)
}
