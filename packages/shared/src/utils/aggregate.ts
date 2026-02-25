import type { TrackingEntry, DailyAggregate, TopDomain, Category } from '../types/tracking'

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

// Aggregate an array of TrackingEntry records into a DailyAggregate.
export function aggregateEntries(
  entries: TrackingEntry[],
  date: string,
): DailyAggregate {
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

// Get today's date string in YYYY-MM-DD format
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

// Get YYYY-MM-DD string for N days ago
export function getDateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
