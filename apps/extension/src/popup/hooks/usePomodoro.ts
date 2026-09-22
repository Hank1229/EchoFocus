import { useCallback, useEffect, useState } from 'react'
import type { PomodoroCommand } from '../../lib/schemas'
import type { PomodoroSnapshot } from '../../background/pomodoro'
import { sendMessage } from '../../lib/messaging'

// The background owns the state; the popup only derives a countdown from
// endsAt. A storage listener catches transitions that happen while the popup
// is open (a focus round ending into a break), and a half-second tick keeps
// the displayed seconds honest without any long-lived timer dependency.

export function usePomodoro() {
  const [pomodoro, setPomodoro] = useState<PomodoroSnapshot | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    void sendMessage<PomodoroSnapshot>('GET_POMODORO').then(response => {
      if (response?.data) setPomodoro(response.data)
    })
  }, [])

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('pomodoro_state' in changes) {
        void sendMessage<PomodoroSnapshot>('GET_POMODORO').then(response => {
          if (response?.data) setPomodoro(response.data)
        })
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(interval)
  }, [])

  const command = useCallback(async (cmd: PomodoroCommand) => {
    const response = await sendMessage<PomodoroSnapshot>('POMODORO_COMMAND', cmd)
    if (response?.data) setPomodoro(response.data)
  }, [])

  const remainingMs =
    pomodoro === null || pomodoro.phase === 'idle'
      ? 0
      : pomodoro.pausedRemainingMs ?? Math.max(0, (pomodoro.endsAt ?? 0) - now)

  return { pomodoro, remainingMs, command }
}
