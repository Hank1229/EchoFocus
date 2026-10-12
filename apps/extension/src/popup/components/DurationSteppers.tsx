import React, { useId } from 'react'
import { Minus, Plus } from 'lucide-react'
import { BREAK_DURATION_LIMITS, FOCUS_DURATION_LIMITS, stepDuration, type DurationLimits } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface DurationSteppersProps {
  focusMinutes: number
  breakMinutes: number
  onChange: (focusMinutes: number, breakMinutes: number) => void
}

// The idle timer's one row of duration steppers, above Start focus. Each value
// is a spinbutton (the WAI-ARIA pattern): Tab stops on the number, the arrow
// keys step it, and the − / + buttons are for the pointer only.
export default function DurationSteppers({ focusMinutes, breakMinutes, onChange }: DurationSteppersProps) {
  const { t } = useLocale()

  return (
    <div className="flex items-center gap-6">
      <Stepper
        label={t.popup.focusLabel}
        shorter={t.popup.shorterFocus}
        longer={t.popup.longerFocus}
        value={focusMinutes}
        limits={FOCUS_DURATION_LIMITS}
        onChange={value => onChange(value, breakMinutes)}
      />
      <Stepper
        label={t.popup.breakLabel}
        shorter={t.popup.shorterBreak}
        longer={t.popup.longerBreak}
        value={breakMinutes}
        limits={BREAK_DURATION_LIMITS}
        onChange={value => onChange(focusMinutes, value)}
      />
    </div>
  )
}

const PAGE_MINUTES = 5

interface StepperProps {
  label: string
  shorter: string
  longer: string
  value: number
  limits: DurationLimits
  onChange: (value: number) => void
}

function Stepper({ label, shorter, longer, value, limits, onChange }: StepperProps) {
  const { t } = useLocale()
  const labelId = useId()
  const atMin = value <= limits.min
  const atMax = value >= limits.max

  const set = (next: number) => {
    if (next !== value) onChange(next)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const next = {
      ArrowUp: () => stepDuration(value, limits.step, limits),
      ArrowRight: () => stepDuration(value, limits.step, limits),
      ArrowDown: () => stepDuration(value, -limits.step, limits),
      ArrowLeft: () => stepDuration(value, -limits.step, limits),
      PageUp: () => stepDuration(value, PAGE_MINUTES, limits),
      PageDown: () => stepDuration(value, -PAGE_MINUTES, limits),
      Home: () => limits.min,
      End: () => limits.max,
    }[event.key]
    if (!next) return
    event.preventDefault()
    set(next())
  }

  const valueText = (value === 1 ? t.popup.minuteValue : t.popup.minutesValue).replace('{n}', String(value))

  return (
    <div role="group" aria-labelledby={labelId} className="flex items-center gap-2">
      <span id={labelId} className="text-caption text-content-secondary">{label}</span>
      <div className="flex items-center gap-1">
        <StepButton label={shorter} disabled={atMin} onPress={() => set(stepDuration(value, -limits.step, limits))}>
          <Minus size={14} strokeWidth={1.5} aria-hidden="true" />
        </StepButton>
        <span
          role="spinbutton"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-valuenow={value}
          aria-valuemin={limits.min}
          aria-valuemax={limits.max}
          aria-valuetext={valueText}
          onKeyDown={onKeyDown}
          className="w-8 rounded-md text-center text-label tabular-nums text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {value}
        </span>
        <StepButton label={longer} disabled={atMax} onPress={() => set(stepDuration(value, limits.step, limits))}>
          <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
        </StepButton>
      </div>
    </div>
  )
}

// aria-disabled, not disabled: a button that disables itself under the
// pointer must not throw keyboard focus away, and the spinbutton announces
// the limit anyway.
function StepButton({ label, disabled, onPress, children }: {
  label: string
  disabled: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => { if (!disabled) onPress() }}
      className={`flex h-7 w-7 items-center justify-center rounded-md border border-line ${
        disabled
          ? 'cursor-default text-content-tertiary'
          : 'pressable text-content-secondary hover:border-line-strong hover:bg-surface-hover hover:text-content'
      }`}
    >
      {children}
    </button>
  )
}
