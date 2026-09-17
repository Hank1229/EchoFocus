import { describe, expect, it } from 'vitest'
import { canGenerateDailyInsight } from './insight-window'

const now = new Date('2026-03-14T09:00:00Z')

describe('canGenerateDailyInsight', () => {
  it('accepts the window the Edge Function accepts: UTC today −2…+1', () => {
    expect(canGenerateDailyInsight('2026-03-12', now)).toBe(true)
    expect(canGenerateDailyInsight('2026-03-13', now)).toBe(true)
    expect(canGenerateDailyInsight('2026-03-14', now)).toBe(true)
    expect(canGenerateDailyInsight('2026-03-15', now)).toBe(true)
  })

  it('rejects days past the window on either side', () => {
    expect(canGenerateDailyInsight('2026-03-11', now)).toBe(false)
    expect(canGenerateDailyInsight('2026-02-28', now)).toBe(false)
    expect(canGenerateDailyInsight('2026-03-16', now)).toBe(false)
  })

  it('measures the window in UTC days, not hours', () => {
    const lateEvening = new Date('2026-03-14T23:59:59Z')
    expect(canGenerateDailyInsight('2026-03-12', lateEvening)).toBe(true)
    expect(canGenerateDailyInsight('2026-03-11', lateEvening)).toBe(false)
  })

  it('rejects a malformed date instead of throwing', () => {
    expect(canGenerateDailyInsight('not-a-date', now)).toBe(false)
    expect(canGenerateDailyInsight('', now)).toBe(false)
  })
})
