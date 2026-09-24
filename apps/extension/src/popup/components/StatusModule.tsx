import React from 'react'
import { TimerModule, type TimerStrings } from '@echofocus/shared/ui'
import type { PomodoroCommand } from '../../lib/schemas'
import type { PomodoroSnapshot } from '../../background/pomodoro'
import { useLocale } from '../../lib/i18n'

interface StatusModuleProps {
  score: number
  totalSeconds: number
  pomodoro: PomodoroSnapshot | null
  remainingMs: number
  onCommand: (cmd: PomodoroCommand) => Promise<void>
}

// Thin wrapper over the shared TimerModule: the popup supplies live worker
// state and its locale strings; the Guide demo supplies mock state.
export default function StatusModule({ score, totalSeconds, pomodoro, remainingMs, onCommand }: StatusModuleProps) {
  const { t } = useLocale()

  const strings: TimerStrings = {
    todaysTotal: t.popup.todaysTotal,
    startFocus: t.popup.startFocus,
    pause: t.popup.pause,
    resume: t.popup.resume,
    skip: t.popup.skip,
    endSession: t.popup.endSession,
    focusing: t.popup.focusing,
    onBreak: t.popup.onBreak,
    timerPaused: t.popup.timerPaused,
    focusScore: t.popup.focusScore,
  }

  return (
    <TimerModule
      score={score}
      totalSeconds={totalSeconds}
      snapshot={pomodoro}
      remainingMs={remainingMs}
      strings={strings}
      onCommand={cmd => void onCommand(cmd)}
    />
  )
}
