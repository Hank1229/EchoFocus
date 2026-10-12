// Pomodoro duration limits, in minutes. Dashboard settings and the popup's
// steppers both read these, so the two editors can never disagree on what a
// valid duration is.

export interface DurationLimits {
  min: number
  max: number
  step: number
}

export const FOCUS_DURATION_LIMITS: DurationLimits = { min: 5, max: 120, step: 5 }

export const BREAK_DURATION_LIMITS: DurationLimits = { min: 1, max: 30, step: 1 }
