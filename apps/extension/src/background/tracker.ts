import type { TrackingEntry, TrackingState, Category } from '@echofocus/shared'
import { extractDomain, categorizeDomain, getTodayDateString } from '@echofocus/shared'
import { getTrackingState, saveTrackingState, saveEntry, recomputeAndSaveAggregate, getSettings, getCustomRules } from './storage'

// Minimum time to consider a visit worth recording (seconds)
const MIN_DURATION_SECONDS = 5

// ─── Session Management ────────────────────────────────────────────────────

let _state: TrackingState = {
  isTracking: true,
  isIdle: false,
  activeTabId: null,
  activeDomain: null,
  activeUrl: null,
  activeTitle: null,
  activeCategory: null,
  sessionStartTime: null,
}

export function getInMemoryState(): TrackingState {
  return { ..._state }
}

// Restore state from chrome.storage on service worker startup.
export async function restoreState(): Promise<void> {
  const saved = await getTrackingState()
  _state = saved

  // If there was an active session when SW was killed, finalize it now.
  if (_state.sessionStartTime !== null && _state.activeDomain) {
    const elapsedMs = Date.now() - _state.sessionStartTime
    const elapsedSec = Math.floor(elapsedMs / 1000)

    // If elapsed time is unreasonably large (> 4 hours), the session is stale.
    // Treat it as max 4 hours.
    const cappedSec = Math.min(elapsedSec, 4 * 60 * 60)

    if (cappedSec >= MIN_DURATION_SECONDS) {
      await saveEntry(buildEntry(_state, cappedSec))
      await recomputeAndSaveAggregate(getTodayDateString())
    }

    // Clear the dangling session
    _state.sessionStartTime = null
    _state.activeTabId = null
    _state.activeDomain = null
    _state.activeUrl = null
    _state.activeTitle = null
    _state.activeCategory = null
    await persistState()
  }
}

function buildEntry(state: TrackingState, durationSeconds: number): TrackingEntry {
  return {
    id: crypto.randomUUID(),
    domain: state.activeDomain ?? '',
    url: state.activeUrl ?? '',
    title: state.activeTitle ?? '',
    category: state.activeCategory ?? 'uncategorized',
    startTime: state.sessionStartTime ?? Date.now(),
    duration: durationSeconds,
    date: getTodayDateString(),
  }
}

async function persistState(): Promise<void> {
  await saveTrackingState(_state)
}

// End the current active session and save the entry if long enough.
async function endCurrentSession(): Promise<void> {
  if (!_state.sessionStartTime || !_state.activeDomain) return

  const durationMs = Date.now() - _state.sessionStartTime
  const durationSec = Math.floor(durationMs / 1000)

  if (durationSec >= MIN_DURATION_SECONDS) {
    const entry = buildEntry(_state, durationSec)
    await saveEntry(entry)
    await recomputeAndSaveAggregate(entry.date)
  }

  _state.sessionStartTime = null
  _state.activeTabId = null
  _state.activeDomain = null
  _state.activeUrl = null
  _state.activeTitle = null
  _state.activeCategory = null
}

// Start tracking a new tab/URL.
async function startSession(tabId: number, url: string, title: string): Promise<void> {
  // Skip chrome:// and extension pages
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url === 'about:blank') {
    _state.sessionStartTime = null
    _state.activeTabId = null
    _state.activeDomain = null
    _state.activeUrl = null
    _state.activeTitle = null
    _state.activeCategory = null
    await persistState()
    return
  }

  const settings = await getSettings()
  if (!settings.trackingEnabled || _state.isIdle) return

  const domain = extractDomain(url)
  const customRules = await getCustomRules()
  const category = categorizeDomain(domain, customRules)

  _state.activeTabId = tabId
  _state.activeDomain = domain
  _state.activeUrl = url
  _state.activeTitle = title
  _state.activeCategory = category
  _state.sessionStartTime = Date.now()
  await persistState()
}

// ─── Chrome Event Handlers ─────────────────────────────────────────────────

// Called when the user switches to a different tab.
export async function handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): Promise<void> {
  await endCurrentSession()

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    await startSession(activeInfo.tabId, tab.url ?? '', tab.title ?? '')
  } catch {
    // Tab may no longer exist
  }

  await persistState()
}

// Called when a tab's URL or title changes.
export async function handleTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
): Promise<void> {
  // Only react to URL or title changes on the active tab
  if (!tab.active) return
  if (!changeInfo.url && !changeInfo.title) return

  // If the URL changed, end the previous session and start a new one.
  if (changeInfo.url) {
    await endCurrentSession()
    await startSession(tabId, changeInfo.url, tab.title ?? '')
  } else if (changeInfo.title && _state.activeTabId === tabId) {
    // Just update the title in memory
    _state.activeTitle = changeInfo.title
    await persistState()
  }
}

// Called when browser window focus changes.
export async function handleWindowFocusChanged(windowId: number): Promise<void> {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // All Chrome windows lost focus — pause tracking
    await endCurrentSession()
    _state.sessionStartTime = null
    await persistState()
  } else {
    // Regained focus — find the active tab and start tracking
    if (_state.isTracking && !_state.isIdle) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (activeTab?.id && activeTab.url) {
          await startSession(activeTab.id, activeTab.url, activeTab.title ?? '')
        }
      } catch {
        // Ignore
      }
    }
  }
}

// Called when the user's idle state changes.
export async function handleIdleStateChanged(
  newState: chrome.idle.IdleState,
): Promise<void> {
  if (newState === 'idle' || newState === 'locked') {
    _state.isIdle = true
    await endCurrentSession()
    await persistState()
  } else if (newState === 'active') {
    _state.isIdle = false
    // Resume tracking the current active tab
    if (_state.isTracking) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (activeTab?.id && activeTab.url) {
          await startSession(activeTab.id, activeTab.url, activeTab.title ?? '')
        }
      } catch {
        // Ignore
      }
    }
    await persistState()
  }
}

// Toggle tracking on/off.
export async function toggleTracking(): Promise<boolean> {
  if (_state.isTracking) {
    // Turn off: end current session
    await endCurrentSession()
    _state.isTracking = false
    await persistState()
  } else {
    // Turn on: start tracking active tab
    _state.isTracking = true
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (activeTab?.id && activeTab.url) {
        await startSession(activeTab.id, activeTab.url, activeTab.title ?? '')
      }
    } catch {
      // Ignore
    }
    await persistState()
  }
  return _state.isTracking
}

// Get live current session info (for popup display).
export function getCurrentSessionInfo(): {
  domain: string | null
  category: Category | null
  elapsedSeconds: number
} {
  if (!_state.sessionStartTime || !_state.activeDomain) {
    return { domain: null, category: null, elapsedSeconds: 0 }
  }
  const elapsedSeconds = Math.floor((Date.now() - _state.sessionStartTime) / 1000)
  return {
    domain: _state.activeDomain,
    category: _state.activeCategory,
    elapsedSeconds,
  }
}
