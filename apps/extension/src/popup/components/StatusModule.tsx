import React from 'react'
import { formatDuration } from '@echofocus/shared'
import type { PomodoroCommand } from '../../lib/schemas'
import type { PomodoroSnapshot } from '../../background/pomodoro'
import FocusScoreRing from './FocusScoreRing'
import { useLocale } from '../../lib/i18n'

interface StatusModuleProps {
  score: number
  totalSeconds: number
  pomodoro: PomodoroSnapshot | null
  remainingMs: number
  onCommand: (cmd: PomodoroCommand) => Promise<void>
}

// The popup's top status module — the only centered area in the product.
// Idle and timer views live stacked in one fixed-height cell and swap with a
// --dur-slow opacity crossfade, so switching never hard-cuts or shifts layout.
export default function StatusModule({ score, totalSeconds, pomodoro, remainingMs, onCommand }: StatusModuleProps) {
  const { t } = useLocale()
  // Narrowed once so TS knows phase is 'focusing' | 'break' inside the timer view.
  const active = pomodoro !== null && pomodoro.phase !== 'idle'
    ? { ...pomodoro, phase: pomodoro.phase as 'focusing' | 'break' }
    : null
  const running = active !== null
  const paused = active !== null && active.pausedRemainingMs !== null

  return (
    <section className="relative h-[224px]">
      <div
        className={`xfade absolute inset-0 flex flex-col items-center justify-center gap-3 ${
          running ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <FocusScoreRing score={score} />
        <div className="flex items-baseline gap-2">
          <span className="text-caption text-content-secondary">{t.popup.todaysTotal}</span>
          <span className="text-stat text-content">{formatDuration(totalSeconds)}</span>
        </div>
        <button
          onClick={() => void onCommand('start')}
          className="pressable rounded-md bg-accent px-5 py-2 text-label text-white dark:text-canvas"
        >
          {t.popup.startFocus}
        </button>
      </div>

      <div
        className={`xfade absolute inset-0 flex flex-col items-center justify-center gap-3 ${
          running ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {active && (
          <>
            <TimerRing
              remainingMs={remainingMs}
              totalMs={(active.phase === 'focusing' ? active.focusMinutes : active.breakMinutes) * 60_000}
              phase={active.phase}
              paused={paused}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => void onCommand(paused ? 'resume' : 'pause')}
                className="pressable rounded-md bg-accent-subtle px-4 py-1.5 text-label text-accent"
              >
                {paused ? t.popup.resume : t.popup.pause}
              </button>
              <button
                onClick={() => void onCommand('skip')}
                className="pressable rounded-md px-3 py-1.5 text-label text-content-secondary hover:bg-surface-hover"
              >
                {t.popup.skip}
              </button>
              <button
                onClick={() => void onCommand('stop')}
                className="pressable rounded-md px-3 py-1.5 text-caption text-content-tertiary hover:bg-surface-hover"
              >
                {t.popup.endSession}
              </button>
            </div>
            <p className="text-caption text-content-tertiary">
              {t.popup.focusScore} {score}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

interface TimerRingProps {
  remainingMs: number
  totalMs: number
  phase: 'focusing' | 'break'
  paused: boolean
}

function TimerRing({ remainingMs, totalMs, phase, paused }: TimerRingProps) {
  const { t } = useLocale()
  const size = 140
  const strokeWidth = 6
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  const fraction = Math.min(1, remainingMs / totalMs)

  const stroke = paused ? 'var(--text-tertiary)' : phase === 'focusing' ? 'var(--accent)' : 'var(--rest)'
  const phaseLabel = paused ? t.popup.timerPaused : phase === 'focusing' ? t.popup.focusing : t.popup.onBreak

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const countdown = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {!paused && (
        <div
          aria-hidden="true"
          className={`absolute inset-1 rounded-full ${phase === 'focusing' ? 'glow-focus' : 'glow-break'}`}
          style={{
            background: phase === 'focusing' ? 'var(--accent)' : 'var(--rest)',
            filter: 'blur(16px)',
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle cx={center} cy={center} r={radius} fill="var(--surface)" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-hero text-content ${paused ? 'opacity-60' : ''}`} role="timer" aria-label={phaseLabel}>
          {countdown}
        </span>
        <span className="text-caption text-content-tertiary">{phaseLabel}</span>
      </div>
    </div>
  )
}
