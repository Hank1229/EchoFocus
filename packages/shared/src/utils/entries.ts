import type { TrackingEntry } from '../types/tracking'
import { formatLocalDate } from './aggregate'

// Split a tracking entry that crosses one or more LOCAL midnights into
// per-day entries, each stamped with its own date and duration.
// An entry fully contained in one day is returned as a single element
// (with its date corrected to the local date of its startTime).
// Derived part ids are deterministic: the first part keeps the original id,
// subsequent parts get "<id>-2", "<id>-3", ...
export function splitEntryAtMidnight(entry: TrackingEntry): TrackingEntry[] {
  const end = entry.startTime + entry.duration * 1000
  const segments: Array<{ start: number; end: number }> = []

  let segStart = entry.startTime
  while (segStart < end) {
    // Local midnight following segStart (setHours(24,...) is DST-safe)
    const nextMidnight = new Date(segStart)
    nextMidnight.setHours(24, 0, 0, 0)
    const segEnd = Math.min(end, nextMidnight.getTime())
    segments.push({ start: segStart, end: segEnd })
    segStart = segEnd
  }

  const parts: TrackingEntry[] = []
  let allocated = 0
  segments.forEach((segment, index) => {
    // The last segment absorbs the rounding remainder, so the parts always sum
    // to exactly the original duration (independent rounding drifts by ±1s).
    const durationSeconds = index === segments.length - 1
      ? entry.duration - allocated
      : Math.round((segment.end - segment.start) / 1000)
    allocated += durationSeconds

    if (durationSeconds > 0) {
      parts.push({
        ...entry,
        id: index === 0 ? entry.id : `${entry.id}-${index + 1}`,
        startTime: segment.start,
        duration: durationSeconds,
        date: formatLocalDate(new Date(segment.start)),
      })
    }
  })

  if (parts.length === 0) {
    // Zero-duration entry — just correct the date
    return [{ ...entry, date: formatLocalDate(new Date(entry.startTime)) }]
  }
  return parts
}
