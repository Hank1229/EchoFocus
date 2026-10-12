import { describe, it, expect } from 'vitest'
import { BREAK_DURATION_LIMITS, FOCUS_DURATION_LIMITS } from '../constants/pomodoro'
import { isValidDuration, stepDuration } from './pomodoro'

describe('stepDuration', () => {
  it('moves focus by its 5-minute step and break by its 1-minute step', () => {
    expect(stepDuration(25, 5, FOCUS_DURATION_LIMITS)).toBe(30)
    expect(stepDuration(25, -5, FOCUS_DURATION_LIMITS)).toBe(20)
    expect(stepDuration(5, 1, BREAK_DURATION_LIMITS)).toBe(6)
    expect(stepDuration(5, -1, BREAK_DURATION_LIMITS)).toBe(4)
  })

  it('takes a 5-minute page jump on the break grid', () => {
    expect(stepDuration(5, 5, BREAK_DURATION_LIMITS)).toBe(10)
    expect(stepDuration(12, -5, BREAK_DURATION_LIMITS)).toBe(7)
  })

  it('stops at the limits', () => {
    expect(stepDuration(120, 5, FOCUS_DURATION_LIMITS)).toBe(120)
    expect(stepDuration(5, -5, FOCUS_DURATION_LIMITS)).toBe(5)
    expect(stepDuration(30, 1, BREAK_DURATION_LIMITS)).toBe(30)
    expect(stepDuration(1, -1, BREAK_DURATION_LIMITS)).toBe(1)
    expect(stepDuration(3, -5, BREAK_DURATION_LIMITS)).toBe(1)
  })

  it('snaps an off-grid value to the nearest step in the direction pressed', () => {
    expect(stepDuration(37, -5, FOCUS_DURATION_LIMITS)).toBe(35)
    expect(stepDuration(37, 5, FOCUS_DURATION_LIMITS)).toBe(40)
  })

  it('pulls an out-of-range value back inside the limits', () => {
    expect(stepDuration(240, -5, FOCUS_DURATION_LIMITS)).toBe(120)
    expect(stepDuration(60, 1, BREAK_DURATION_LIMITS)).toBe(30)
  })
})

describe('isValidDuration', () => {
  it('accepts whole minutes on the grid inside the limits', () => {
    expect(isValidDuration(5, FOCUS_DURATION_LIMITS)).toBe(true)
    expect(isValidDuration(120, FOCUS_DURATION_LIMITS)).toBe(true)
    expect(isValidDuration(1, BREAK_DURATION_LIMITS)).toBe(true)
    expect(isValidDuration(30, BREAK_DURATION_LIMITS)).toBe(true)
  })

  it('rejects values off the grid, outside the limits, or fractional', () => {
    expect(isValidDuration(37, FOCUS_DURATION_LIMITS)).toBe(false)
    expect(isValidDuration(125, FOCUS_DURATION_LIMITS)).toBe(false)
    expect(isValidDuration(0, BREAK_DURATION_LIMITS)).toBe(false)
    expect(isValidDuration(31, BREAK_DURATION_LIMITS)).toBe(false)
    expect(isValidDuration(2.5, BREAK_DURATION_LIMITS)).toBe(false)
  })
})
