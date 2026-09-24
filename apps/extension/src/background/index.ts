import { getSettings, getCustomRules, saveCustomRules, getAiAnalysis, saveAiAnalysis, recomputeAndSaveAggregate, getAllDataForExport, deleteAllTrackingData, getStorageInfo } from './storage'
import {
  restoreState,
  handleTabActivated,
  handleTabUpdated,
  handleWindowFocusChanged,
  handleIdleStateChanged,
  toggleTracking,
  discardCurrentSession,
  getCurrentSessionInfo,
  getInMemoryState,
} from './tracker'
import { applySettings } from './settings'
import { setupAlarms, ensureHeartbeatAlarm, handleAlarm } from './alarms'
import { openDailySummary } from './notifications'
import { partialSettingsSchema, classificationRuleArraySchema, dateStringSchema, aiAnalysisRequestSchema, pomodoroCommandSchema } from '../lib/schemas'
import * as pomodoro from './pomodoro'
import { requestAiAnalysis } from '../lib/ai'
import { getTodayDateString } from '@echofocus/shared'
import { drainSyncQueue, enqueueMissedSyncDates, backfillHistoryIfNeeded } from '../lib/sync'
import { pushRules, pushSettings, reconcileWithCloud, reconcileIfStale, pullThemeNow } from '../lib/prefs-sync'

// ─── Message Types ─────────────────────────────────────────────────────────

type MessageType =
  | 'GET_TRACKING_STATE'
  | 'TOGGLE_TRACKING'
  | 'GET_CURRENT_SESSION'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'GET_CUSTOM_RULES'
  | 'SAVE_CUSTOM_RULES'
  | 'REQUEST_AI_ANALYSIS'
  | 'GET_AI_ANALYSIS'
  | 'EXPORT_DATA'
  | 'DELETE_ALL_DATA'
  | 'GET_STORAGE_INFO'
  | 'GET_POMODORO'
  | 'POMODORO_COMMAND'

interface IncomingMessage {
  type: MessageType
  payload?: unknown
}

// ─── Initialization ────────────────────────────────────────────────────────

// Single initialization promise for this service-worker lifetime.
// restoreState() runs exactly once; EVERY event handler and message branch
// awaits `ready` first, so no handler can observe pre-restore state and the
// dangling-session finalization can never run twice.
const ready: Promise<void> = (async () => {
  await restoreState()
  await ensureHeartbeatAlarm()
})().catch((err) => {
  console.error('[EchoFocus] Initialization failed:', err)
})

// ─── Extension Lifecycle ───────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  await ready
  console.log('[EchoFocus] Installed:', details.reason)
  await setupAlarms()
  // Initialize idle detection with default 2-minute threshold
  const settings = await getSettings()
  chrome.idle.setDetectionInterval(settings.idleTimeoutMinutes * 60)
  // Open onboarding page on first install
  if (details.reason === 'install') {
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding/index.html') })
  }
})

chrome.runtime.onStartup.addListener(async () => {
  await ready // reuses the single restore — no double restore
  console.log('[EchoFocus] Browser started')
  await setupAlarms()
  const settings = await getSettings()
  chrome.idle.setDetectionInterval(settings.idleTimeoutMinutes * 60)
  // Pick up rule and preference edits made elsewhere, then retry any sync days
  // that failed on previous nights — plus the ones whose nightly alarm never
  // fired because the browser was closed at 00:05
  try {
    await reconcileWithCloud()
    // Covers a sign-in whose backfill was interrupted (options page closed
    // mid-upload) — the marker is per-user and only set after a clean pass.
    await backfillHistoryIfNeeded()
    await enqueueMissedSyncDates()
    await drainSyncQueue()
  } catch (err) {
    console.error('[EchoFocus] Startup sync drain failed:', err)
  }
})

// ─── Tab & Window Events ───────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await ready
  await handleTabActivated(activeInfo)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await ready
  await handleTabUpdated(tabId, changeInfo, tab)
})

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await ready
  await handleWindowFocusChanged(windowId)
})

// ─── Idle Detection ────────────────────────────────────────────────────────

chrome.idle.onStateChanged.addListener(async (newState) => {
  await ready
  await handleIdleStateChanged(newState)
})

// ─── Alarms ───────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await ready
  await handleAlarm(alarm)
})

// ─── Notifications ─────────────────────────────────────────────────────────

chrome.notifications.onClicked.addListener(async (notificationId) => {
  await openDailySummary(notificationId)
})

// ─── Message Handling (from Popup / Options) ───────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: IncomingMessage, _sender, sendResponse) => {
    // Handle async messages — must return true to keep channel open
    handleMessage(message)
      .then(sendResponse)
      .catch((err) => {
        console.error('[EchoFocus] Message handler error:', err)
        sendResponse({ success: false, error: 'Something went wrong — please try again or reload the extension' })
      })
    return true
  },
)

// Exported for tests — background/index.test.ts calls it directly instead of
// going through chrome.runtime.onMessage.
export async function handleMessage(
  message: IncomingMessage,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  // Never answer from pre-restore in-memory state
  await ready

  switch (message.type) {
    case 'GET_TRACKING_STATE': {
      const state = getInMemoryState()
      return { success: true, data: state }
    }

    case 'TOGGLE_TRACKING': {
      const isNowTracking = await toggleTracking()
      return { success: true, data: { isTracking: isNowTracking } }
    }

    case 'GET_CURRENT_SESSION': {
      const session = getCurrentSessionInfo()
      return { success: true, data: session }
    }

    case 'GET_SETTINGS': {
      const settings = await getSettings()
      return { success: true, data: settings }
    }

    case 'SAVE_SETTINGS': {
      const parsed = partialSettingsSchema.safeParse(message.payload)
      if (!parsed.success) {
        return { success: false, error: 'Invalid settings payload' }
      }
      await applySettings(parsed.data)
      await pushSettings()
      return { success: true }
    }

    case 'GET_CUSTOM_RULES': {
      const rules = await getCustomRules()
      return { success: true, data: rules }
    }

    case 'SAVE_CUSTOM_RULES': {
      const parsed = classificationRuleArraySchema.safeParse(message.payload)
      if (!parsed.success) {
        return { success: false, error: 'Invalid rules — each rule needs a pattern, match type, and category' }
      }
      await saveCustomRules(parsed.data)
      await pushRules()
      return { success: true }
    }

    case 'GET_AI_ANALYSIS': {
      const parsed = dateStringSchema.safeParse(message.payload)
      if (!parsed.success) {
        return { success: false, error: 'Invalid date' }
      }
      const analysis = await getAiAnalysis(parsed.data)
      return { success: true, data: analysis }
    }

    case 'REQUEST_AI_ANALYSIS': {
      const parsed = aiAnalysisRequestSchema.safeParse(message.payload)
      if (!parsed.success) {
        return { success: false, error: 'Invalid request — a date (YYYY-MM-DD) is required' }
      }
      const date = typeof parsed.data === 'string' ? parsed.data : parsed.data.date
      const language = typeof parsed.data === 'string' ? 'en' : (parsed.data.language ?? 'en')

      // Recompute first so a request for TODAY sees the session currently in
      // progress. Entries are pruned by retention but aggregates are kept 365
      // days, so recomputing any other date would rebuild it from zero
      // entries and overwrite the preserved aggregate with zeros.
      if (date === getTodayDateString()) {
        await recomputeAndSaveAggregate(date)
      }

      // The reason travels as a code; the popup owns the wording so the user
      // reads it in their own language.
      const outcome = await requestAiAnalysis(date, language)
      if (!outcome.ok) {
        return { success: false, error: outcome.reason }
      }
      await saveAiAnalysis(date, outcome.result)
      return { success: true, data: outcome.result }
    }

    case 'EXPORT_DATA': {
      const data = await getAllDataForExport()
      return { success: true, data }
    }

    case 'DELETE_ALL_DATA': {
      // Discard the in-flight session first so it can't materialize a new
      // entry right after the wipe; tracking on/off stays as the user set it.
      await discardCurrentSession()
      await deleteAllTrackingData()
      return { success: true }
    }

    case 'GET_STORAGE_INFO': {
      const info = await getStorageInfo()
      return { success: true, data: info }
    }

    case 'GET_POMODORO': {
      // Every popup open lands here — piggyback a throttled cloud pull so
      // dashboard edits (durations, theme) are fresh before a round starts.
      // Fire-and-forget: the popup must not wait on the network.
      void reconcileIfStale().catch(() => undefined)
      void pullThemeNow().catch(() => undefined)
      return { success: true, data: await pomodoro.snapshot() }
    }

    case 'POMODORO_COMMAND': {
      const parsed = pomodoroCommandSchema.safeParse(message.payload)
      if (!parsed.success) {
        return { success: false, error: 'Invalid pomodoro command' }
      }
      return { success: true, data: await pomodoro.run(parsed.data) }
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` }
  }
}

// Keep service worker alive during message handling (belt-and-suspenders)
chrome.runtime.onConnect.addListener(() => {
  // Connection from popup keeps SW alive while popup is open
})
