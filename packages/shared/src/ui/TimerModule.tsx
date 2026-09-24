import { formatDuration } from '../utils'

// The pomodoro status module — one component for the popup (live state from
// the service worker) and the dashboard Guide's interactive demo (mock state).
// Strings and commands are injected so the module carries no i18n or
// messaging dependencies of its own. Styling leans on the DESIGN.md token
// classes plus the .xfade/.glow-* rules, which both apps' stylesheets define.

export type TimerPhase = 'idle' | 'focusing' | 'break'

export interface TimerSnapshot {
  phase: TimerPhase
  endsAt: number | null
  pausedRemainingMs: number | null
  focusMinutes: number
  breakMinutes: number
}

export type TimerCommand = 'start' | 'pause' | 'resume' | 'skip' | 'stop'

export interface TimerStrings {
  todaysTotal: string
  startFocus: string
  pause: string
  resume: string
  skip: string
  endSession: string
  focusing: string
  onBreak: string
  timerPaused: string
  focusScore: string
}

interface TimerModuleProps {
  score: number
  totalSeconds: number
  snapshot: TimerSnapshot | null
  remainingMs: number
  strings: TimerStrings
  onCommand: (cmd: TimerCommand) => void
}

// Idle and timer views live stacked in one fixed-height cell and swap with a
// --dur-slow opacity crossfade, so switching never hard-cuts or shifts layout.
export function TimerModule({ score, totalSeconds, snapshot, remainingMs, strings, onCommand }: TimerModuleProps) {
  const active = snapshot !== null && snapshot.phase !== 'idle'
    ? { ...snapshot, phase: snapshot.phase as 'focusing' | 'break' }
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
        <ScoreRing score={score} label={strings.focusScore} />
        <div className="flex items-baseline gap-2">
          <span className="text-caption text-content-secondary">{strings.todaysTotal}</span>
          <span className="text-stat text-content">{formatDuration(totalSeconds)}</span>
        </div>
        <button
          onClick={() => onCommand('start')}
          className="pressable rounded-md bg-accent px-5 py-2 text-label text-accent-ink"
        >
          {strings.startFocus}
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
              strings={strings}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => onCommand(paused ? 'resume' : 'pause')}
                className="pressable rounded-md bg-accent-subtle px-4 py-1.5 text-label text-accent"
              >
                {paused ? strings.resume : strings.pause}
              </button>
              <button
                onClick={() => onCommand('skip')}
                className="pressable rounded-md px-3 py-1.5 text-label text-content-secondary hover:bg-surface-hover"
              >
                {strings.skip}
              </button>
              <button
                onClick={() => onCommand('stop')}
                className="pressable rounded-md px-3 py-1.5 text-caption text-content-tertiary hover:bg-surface-hover"
              >
                {strings.endSession}
              </button>
            </div>
            <p className="text-caption text-content-tertiary">
              {strings.focusScore} {score}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const size = 104
  const strokeWidth = 7
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  // Low tier stays on --text-secondary, not tertiary: a 40px numeral is
  // essential content and tertiary fails contrast on the light theme.
  const stroke = score >= 70 ? 'var(--productive)' : score >= 40 ? 'var(--accent)' : 'var(--text-secondary)'

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (score / 100) * circumference}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-hero" style={{ color: stroke }}>{score}</span>
      </div>
    </div>
  )
}

interface TimerRingProps {
  remainingMs: number
  totalMs: number
  phase: 'focusing' | 'break'
  paused: boolean
  strings: TimerStrings
}

function TimerRing({ remainingMs, totalMs, phase, paused, strings }: TimerRingProps) {
  const size = 140
  const strokeWidth = 6
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  const fraction = Math.min(1, remainingMs / totalMs)

  const stroke = paused ? 'var(--text-tertiary)' : phase === 'focusing' ? 'var(--accent)' : 'var(--rest)'
  const phaseLabel = paused ? strings.timerPaused : phase === 'focusing' ? strings.focusing : strings.onBreak

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
