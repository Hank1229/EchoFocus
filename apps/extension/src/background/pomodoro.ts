import {
  pomodoroStateSchema,
  pomodoroSettingsSchema,
  type PomodoroCommand,
  type PomodoroSettings,
  type PomodoroState,
} from '../lib/schemas'
import { STORAGE_FULL_KEY } from './storage'
import en from '../locales/en.json'
import zhTW from '../locales/zh-TW.json'

// All timing goes through chrome.alarms with an absolute `when` — the service
// worker is recycled constantly, so nothing here may depend on a live timer.
// The stored state is the single source of truth: `endsAt` while running,
// `pausedRemainingMs` while paused. The popup derives its countdown from the
// same fields.

export const POMODORO_ALARM = 'echofocus-pomodoro'

const STATE_KEY = 'pomodoro_state'
const SETTINGS_KEY = 'pomodoro_settings'

const FOCUS_END_NOTIFICATION = 'echofocus-pomodoro-focus-end'
const BREAK_END_NOTIFICATION = 'echofocus-pomodoro-break-end'
const ICON_PATH = 'src/assets/icon-128.png'

// The badge is chrome UI, outside the page's CSS variables — these are the
// light-theme accent and rest hexes from DESIGN.md.
const FOCUS_BADGE = '#0D9488'
const BREAK_BADGE = '#D97706'

const IDLE: PomodoroState = { phase: 'idle', endsAt: null, pausedRemainingMs: null }

export interface PomodoroSnapshot extends PomodoroState {
  focusMinutes: number
  breakMinutes: number
}

async function getState(): Promise<PomodoroState> {
  const stored = await chrome.storage.local.get(STATE_KEY)
  const parsed = pomodoroStateSchema.safeParse(stored[STATE_KEY])
  return parsed.success ? parsed.data : IDLE
}

async function setState(state: PomodoroState): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: state })
}

// Written by the dashboard settings page in Phase 2; until then the defaults.
export async function getPomodoroSettings(): Promise<PomodoroSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  const parsed = pomodoroSettingsSchema.safeParse(stored[SETTINGS_KEY])
  return parsed.success ? parsed.data : { focusMinutes: 25, breakMinutes: 5 }
}

export async function snapshot(): Promise<PomodoroSnapshot> {
  const [state, settings] = await Promise.all([getState(), getPomodoroSettings()])
  return { ...state, ...settings }
}

export async function run(command: PomodoroCommand): Promise<PomodoroSnapshot> {
  const state = await getState()

  switch (command) {
    case 'start':
      if (state.phase === 'idle') await begin('focusing')
      break

    case 'pause':
      if (state.endsAt !== null && state.pausedRemainingMs === null) {
        await chrome.alarms.clear(POMODORO_ALARM)
        await setState({
          ...state,
          pausedRemainingMs: Math.max(0, state.endsAt - Date.now()),
        })
      }
      break

    case 'resume':
      if (state.pausedRemainingMs !== null) {
        const endsAt = Date.now() + state.pausedRemainingMs
        await setState({ ...state, endsAt, pausedRemainingMs: null })
        await chrome.alarms.create(POMODORO_ALARM, { when: endsAt })
      }
      break

    case 'skip':
      // A skip jumps to the next phase without the end-of-phase notification —
      // the user is looking at the popup, there is nobody to alert.
      if (state.phase === 'focusing') await begin('break')
      else if (state.phase === 'break') await begin('focusing')
      break

    case 'stop':
      await chrome.alarms.clear(POMODORO_ALARM)
      await setState(IDLE)
      break
  }

  await refreshBadge()
  return snapshot()
}

async function begin(phase: 'focusing' | 'break'): Promise<void> {
  const { focusMinutes, breakMinutes } = await getPomodoroSettings()
  const minutes = phase === 'focusing' ? focusMinutes : breakMinutes
  const endsAt = Date.now() + minutes * 60_000
  await setState({ phase, endsAt, pausedRemainingMs: null })
  // Unlike the recurring alarms, replacing a pending pomodoro alarm is the point.
  await chrome.alarms.create(POMODORO_ALARM, { when: endsAt })
}

// The POMODORO_ALARM fired: the running phase reached its end.
export async function advance(): Promise<void> {
  const state = await getState()
  // A cleared alarm can still fire if the SW raced a stop/pause — ignore it.
  if (state.phase === 'idle' || state.endsAt === null || state.pausedRemainingMs !== null) return

  if (state.phase === 'focusing') {
    await notify(FOCUS_END_NOTIFICATION)
    await begin('break')
  } else {
    await notify(BREAK_END_NOTIFICATION)
    await begin('focusing')
  }
  await refreshBadge()
}

// Remaining minutes on the extension icon. Called on every transition and on
// the 1-minute heartbeat alarm. The storage-full '!' badge outranks it.
export async function refreshBadge(): Promise<void> {
  const flagged = await chrome.storage.local.get(STORAGE_FULL_KEY)
  if (flagged[STORAGE_FULL_KEY] !== undefined) return

  const state = await getState()
  if (state.phase === 'idle') {
    await chrome.action.setBadgeText({ text: '' })
    return
  }

  const remainingMs = state.pausedRemainingMs ?? Math.max(0, (state.endsAt ?? 0) - Date.now())
  await chrome.action.setBadgeText({ text: String(Math.max(1, Math.ceil(remainingMs / 60_000))) })
  await chrome.action.setBadgeBackgroundColor({
    color: state.phase === 'focusing' ? FOCUS_BADGE : BREAK_BADGE,
  })
}

async function notify(id: string): Promise<void> {
  const { language } = await chrome.storage.local.get('language')
  const locale = language === 'zh-TW' ? (zhTW as typeof en) : en
  const { focusMinutes, breakMinutes } = await getPomodoroSettings()

  const copy =
    id === FOCUS_END_NOTIFICATION
      ? {
          title: locale.notifications.pomodoro.focusEndTitle,
          message: locale.notifications.pomodoro.focusEndMessage.replace('{n}', String(breakMinutes)),
        }
      : {
          title: locale.notifications.pomodoro.breakEndTitle,
          message: locale.notifications.pomodoro.breakEndMessage.replace('{n}', String(focusMinutes)),
        }

  // Creating over an id that still sits in the macOS Notification Center
  // replaces it in place WITHOUT re-alerting — clear first so every phase
  // end actually pops a banner.
  await chrome.notifications.clear(id)
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL(ICON_PATH),
    title: copy.title,
    message: copy.message,
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[EchoFocus] pomodoro notification failed:', chrome.runtime.lastError.message)
    }
  })
}
