import { useCallback, useEffect, useRef, useState } from 'react'
import type { PomodoroCommand, PomodoroSettings } from '../../lib/schemas'
import type { PomodoroSnapshot } from '../../background/pomodoro'
import { sendMessage } from '../../lib/messaging'

// The background owns the state; the popup only derives a countdown from
// endsAt. A storage listener catches transitions that happen while the popup
// is open (a focus round ending into a break), and a half-second tick keeps
// the displayed seconds honest without any long-lived timer dependency.

export function usePomodoro() {
  const [pomodoro, setPomodoro] = useState<PomodoroSnapshot | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // The durations last asked for by the steppers, until a snapshot carries
  // them. Snapshots fetched for earlier presses arrive in between, and taking
  // their durations would make the next press step from a stale value.
  const requested = useRef<PomodoroSettings | null>(null)

  const adopt = useCallback((snapshot: PomodoroSnapshot) => {
    const want = requested.current
    if (want && (snapshot.focusMinutes !== want.focusMinutes || snapshot.breakMinutes !== want.breakMinutes)) {
      setPomodoro({ ...snapshot, ...want })
      return
    }
    requested.current = null
    setPomodoro(snapshot)
  }, [])

  useEffect(() => {
    void sendMessage<PomodoroSnapshot>('GET_POMODORO').then(response => {
      if (response?.data) adopt(response.data)
    })
  }, [adopt])

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      // State transitions AND duration edits (synced from the dashboard)
      // both re-read the snapshot so the ring's total stays honest.
      if ('pomodoro_state' in changes || 'pomodoro_settings' in changes) {
        void sendMessage<PomodoroSnapshot>('GET_POMODORO').then(response => {
          if (response?.data) adopt(response.data)
        })
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [adopt])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(interval)
  }, [])

  const command = useCallback(async (cmd: PomodoroCommand) => {
    const response = await sendMessage<PomodoroSnapshot>('POMODORO_COMMAND', cmd)
    if (response?.data) adopt(response.data)
  }, [adopt])

  const setDurations = useCallback(async (focusMinutes: number, breakMinutes: number) => {
    requested.current = { focusMinutes, breakMinutes }
    setPomodoro(prev => (prev ? { ...prev, focusMinutes, breakMinutes } : prev))
    const response = await sendMessage<PomodoroSnapshot>('SET_POMODORO_DURATIONS', { focusMinutes, breakMinutes })
    if (!response?.success) {
      // Refused (a round started meanwhile) or never delivered: show what the
      // worker actually has.
      requested.current = null
      const current = await sendMessage<PomodoroSnapshot>('GET_POMODORO')
      if (current?.data) setPomodoro(current.data)
    }
  }, [])

  const remainingMs =
    pomodoro === null || pomodoro.phase === 'idle'
      ? 0
      : pomodoro.pausedRemainingMs ?? Math.max(0, (pomodoro.endsAt ?? 0) - now)

  return { pomodoro, remainingMs, command, setDurations }
}
