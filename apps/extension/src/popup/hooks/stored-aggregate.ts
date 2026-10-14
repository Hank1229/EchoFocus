import type { DailyAggregate } from '@echofocus/shared'
import { dailyAggregateSchema } from '../../lib/schemas'

// The popup reads `aggregates:<today>` straight from chrome.storage.local, so
// it sees the same raw value the worker's getAggregateForDate() validates. A
// value that fails the schema (a leftover from an older build, an interrupted
// write) is treated as "no aggregate", exactly like the worker does, instead
// of being rendered as NaN minutes.
export function parseStoredAggregate(value: unknown): DailyAggregate | null {
  if (value === undefined || value === null) return null
  const parsed = dailyAggregateSchema.safeParse(value)
  if (!parsed.success) {
    console.warn('[EchoFocus] Invalid stored aggregate, ignoring:', parsed.error.message)
    return null
  }
  return parsed.data
}
