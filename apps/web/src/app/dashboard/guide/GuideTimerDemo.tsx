'use client'

import { useEffect, useRef, useState } from 'react'
import { TimerModule, type TimerCommand, type TimerSnapshot, type TimerStrings } from '@echofocus/shared/ui'
import { useLocale } from '@/lib/i18n'

// The Guide's hands-on timer: the extension's actual TimerModule driven by a
// local mock of the pomodoro state machine. Nothing runs until the user
// presses start; unmounting the step stops everything.

const DEMO: Pick<TimerSnapshot, 'focusMinutes' | 'breakMinutes'> = { focusMinutes: 25, breakMinutes: 5 }

const IDLE: TimerSnapshot = { phase: 'idle', endsAt: null, pausedRemainingMs: null, ...DEMO }

function useMockPomodoro() {
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(IDLE)
  const [now, setNow] = useState(() => Date.now())
  const snapRef = useRef(snapshot)
  snapRef.current = snapshot

  const begin = (phase: 'focusing' | 'break'): TimerSnapshot => ({
    phase,
    endsAt: Date.now() + (phase === 'focusing' ? DEMO.focusMinutes : DEMO.breakMinutes) * 60_000,
    pausedRemainingMs: null,
    ...DEMO,
  })

  const command = (cmd: TimerCommand) => {
    const s = snapRef.current
    switch (cmd) {
      case 'start':
        if (s.phase === 'idle') setSnapshot(begin('focusing'))
        break
      case 'pause':
        if (s.endsAt !== null && s.pausedRemainingMs === null) {
          setSnapshot({ ...s, pausedRemainingMs: Math.max(0, s.endsAt - Date.now()) })
        }
        break
      case 'resume':
        if (s.pausedRemainingMs !== null) {
          setSnapshot({ ...s, endsAt: Date.now() + s.pausedRemainingMs, pausedRemainingMs: null })
        }
        break
      case 'skip':
        if (s.phase === 'focusing') setSnapshot(begin('break'))
        else if (s.phase === 'break') setSnapshot(begin('focusing'))
        break
      case 'stop':
        setSnapshot(IDLE)
        break
    }
  }

  // Tick while running; roll into the next phase at zero, like the real one.
  useEffect(() => {
    if (snapshot.phase === 'idle' || snapshot.pausedRemainingMs !== null) return
    const interval = setInterval(() => {
      setNow(Date.now())
      const s = snapRef.current
      if (s.endsAt !== null && s.endsAt <= Date.now()) {
        setSnapshot(begin(s.phase === 'focusing' ? 'break' : 'focusing'))
      }
    }, 500)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.phase, snapshot.pausedRemainingMs])

  const remainingMs =
    snapshot.phase === 'idle'
      ? 0
      : snapshot.pausedRemainingMs ?? Math.max(0, (snapshot.endsAt ?? 0) - now)

  return { snapshot, remainingMs, command }
}

export default function GuideTimerDemo() {
  const { t } = useLocale()
  const { snapshot, remainingMs, command } = useMockPomodoro()

  const strings: TimerStrings = t.timer

  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-4">
      <TimerModule
        score={76}
        totalSeconds={22680}
        snapshot={snapshot}
        remainingMs={remainingMs}
        strings={strings}
        onCommand={command}
      />
      <p className="mt-2 text-center text-caption text-content-tertiary">{t.guide.timerDemoHint}</p>
    </div>
  )
}
