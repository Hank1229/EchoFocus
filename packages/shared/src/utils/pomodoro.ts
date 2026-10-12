import type { DurationLimits } from '../constants/pomodoro'

// Moves a duration by `delta` minutes, then lands on the step grid inside the
// limits. A value off the grid (a cloud row written some other way, say 37)
// only snaps on the first press: down to 35, up to 40.
export function stepDuration(value: number, delta: number, { min, max, step }: DurationLimits): number {
  const target = value % step === 0 ? value + delta : value
  const snapped = delta < 0 ? Math.floor(target / step) * step : Math.ceil(target / step) * step
  return Math.min(max, Math.max(min, snapped))
}

export function isValidDuration(value: number, { min, max, step }: DurationLimits): boolean {
  return Number.isInteger(value) && value >= min && value <= max && value % step === 0
}
