import { getSettings, saveSettings, getCustomRules, saveCustomRules, getAiAnalysis, saveAiAnalysis, recomputeAndSaveAggregate, getAllDataForExport, deleteAllTrackingData, getStorageInfo } from './storage'
import {
  restoreState,
  handleTabActivated,
  handleTabUpdated,
  handleWindowFocusChanged,
  handleIdleStateChanged,
  toggleTracking,
  getCurrentSessionInfo,
  getInMemoryState,
} from './tracker'
import { setupAlarms, handleAlarm } from './alarms'
import type { ClassificationRule } from '@echofocus/shared'
import { requestAiAnalysis } from '../lib/ai'

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

interface IncomingMessage {
  type: MessageType
  payload?: unknown
}

// ─── Extension Lifecycle ───────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
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
  console.log('[EchoFocus] Browser started')
  await restoreState()
  await setupAlarms()
  const settings = await getSettings()
  chrome.idle.setDetectionInterval(settings.idleTimeoutMinutes * 60)
})

// Restore state when service worker wakes up for any reason
// (This runs immediately when the SW module is loaded)
;(async () => {
  await restoreState()
})()

// ─── Tab & Window Events ───────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabActivated(activeInfo)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await handleTabUpdated(tabId, changeInfo, tab)
})

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await handleWindowFocusChanged(windowId)
})

// ─── Idle Detection ────────────────────────────────────────────────────────

chrome.idle.onStateChanged.addListener(async (newState) => {
  await handleIdleStateChanged(newState)
})

// ─── Alarms ───────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await handleAlarm(alarm)
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

async function handleMessage(
  message: IncomingMessage,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
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
      if (message.payload && typeof message.payload === 'object') {
        await saveSettings(message.payload as Record<string, unknown>)
        // Update idle detection interval if changed
        const settings = await getSettings()
        chrome.idle.setDetectionInterval(settings.idleTimeoutMinutes * 60)
      }
      return { success: true }
    }

    case 'GET_CUSTOM_RULES': {
      const rules = await getCustomRules()
      return { success: true, data: rules }
    }

    case 'SAVE_CUSTOM_RULES': {
      const rules = message.payload as ClassificationRule[]
      if (Array.isArray(rules)) {
        await saveCustomRules(rules)
      }
      return { success: true }
    }

    case 'GET_AI_ANALYSIS': {
      const date = message.payload as string
      const analysis = await getAiAnalysis(date)
      return { success: true, data: analysis }
    }

    case 'REQUEST_AI_ANALYSIS': {
      const date = message.payload as string
      // Ensure aggregate is fresh before calling AI
      await recomputeAndSaveAggregate(date)
      const result = await requestAiAnalysis(date)
      if (result) {
        await saveAiAnalysis(date, result)
      }
      // Return success:false if null so popup can show error
      if (!result) return { success: false, error: 'Analysis failed: please sign in via Settings → Account, and make sure you have browsing data for today' }
      return { success: true, data: result }
    }

    case 'EXPORT_DATA': {
      const data = await getAllDataForExport()
      return { success: true, data }
    }

    case 'DELETE_ALL_DATA': {
      await deleteAllTrackingData()
      return { success: true }
    }

    case 'GET_STORAGE_INFO': {
      const info = await getStorageInfo()
      return { success: true, data: info }
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` }
  }
}

// Keep service worker alive during message handling (belt-and-suspenders)
chrome.runtime.onConnect.addListener(() => {
  // Connection from popup keeps SW alive while popup is open
})
