import { describe, it, expect } from 'vitest'
import { calculateStreak, type StreakDay } from './streak'

const GOAL_MINUTES = 360
const MET = GOAL_MINUTES * 60
const SHORT = MET - 60

// Builds days for the given dates in March 2026, each meeting the goal.
function metDays(...dayOfMonth: number[]): StreakDay[] {
  return dayOfMonth.map((d) => ({
    date: `2026-03-${String(d).padStart(2, '0')}`,
    productiveSeconds: MET,
  }))
}

describe('calculateStreak', () => {
  it('returns zeros for an empty history', () => {
    expect(calculateStreak([], GOAL_MINUTES, '2026-03-10')).toEqual({ current: 0, best: 0 })
  })

  it('counts a run ending today when today already met the goal', () => {
    const days = metDays(8, 9, 10)
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 3, best: 3 })
  })

  it('keeps the streak alive when today is still short of the goal', () => {
    const days = [...metDays(8, 9), { date: '2026-03-10', productiveSeconds: SHORT }]
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 2, best: 2 })
  })

  it('keeps the streak alive when today has no aggregate at all', () => {
    expect(calculateStreak(metDays(8, 9), GOAL_MINUTES, '2026-03-10')).toEqual({ current: 2, best: 2 })
  })

  it('breaks the streak when yesterday missed the goal', () => {
    const days = [...metDays(7, 8), { date: '2026-03-09', productiveSeconds: SHORT }]
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 0, best: 2 })
  })

  it('treats a missing day as a gap that breaks the run', () => {
    // 06, 07 met — 08 absent — 09, 10 met
    const days = metDays(6, 7, 9, 10)
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 2, best: 2 })
  })

  it('reports the best run from history when the current streak is broken', () => {
    // 01–05 met, 06 missed, 09–10 met but today (12) and 11 missing
    const days = [
      ...metDays(1, 2, 3, 4, 5),
      { date: '2026-03-06', productiveSeconds: SHORT },
      ...metDays(9, 10),
    ]
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-12')).toEqual({ current: 0, best: 5 })
  })

  it('counts a day whose productive time lands exactly on the goal', () => {
    const days = [{ date: '2026-03-10', productiveSeconds: MET }]
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 1, best: 1 })
  })

  it('does not count a day one second short of the goal', () => {
    const days = [{ date: '2026-03-10', productiveSeconds: MET - 1 }]
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 0, best: 0 })
  })

  it('ignores input order', () => {
    const days = metDays(10, 7, 9, 8)
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 4, best: 4 })
  })

  it('crosses a month boundary', () => {
    const days = [
      { date: '2026-02-27', productiveSeconds: MET },
      { date: '2026-02-28', productiveSeconds: MET },
      { date: '2026-03-01', productiveSeconds: MET },
    ]
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-01')).toEqual({ current: 3, best: 3 })
  })

  it('reacts to a changed goal', () => {
    const days = [
      { date: '2026-03-09', productiveSeconds: 200 * 60 },
      { date: '2026-03-10', productiveSeconds: 200 * 60 },
    ]
    expect(calculateStreak(days, 180, '2026-03-10')).toEqual({ current: 2, best: 2 })
    expect(calculateStreak(days, 240, '2026-03-10')).toEqual({ current: 0, best: 0 })
  })

  it('ignores days after today when counting the current run', () => {
    const days = metDays(10, 11, 12)
    expect(calculateStreak(days, GOAL_MINUTES, '2026-03-10')).toEqual({ current: 1, best: 3 })
  })
})
