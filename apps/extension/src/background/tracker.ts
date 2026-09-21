import type { TrackingEntry, TrackingState, Category } from '@echofocus/shared'
import { extractDomain, categorizeUrl, splitEntryAtMidnight, formatLocalDate, getTodayDateString } from '@echofocus/shared'
import {
  getTrackingState,
  saveTrackingState,
  saveEntry,
  recomputeAndSaveAggregate,
  getSettings,
  saveSettings,
  getCustomRules,
  getLastSeenAt,
  saveLastSeenAt,
  MAX_URL_LENGTH,
  MAX_TITLE_LENGTH,
} from './storage'
// lib/sync-queue, not lib/sync: sync.ts pulls in prefs-sync.ts, which imports
// this module's applyTrackingEnabled via ./settings — importing sync.ts here
// would close that loop into a circular import.
import { enqueueSyncDate } from '../lib/sync-queue'

// Minimum time to consider a visit worth recording (seconds)
const MIN_DURATION_SECONDS = 5

// A dangling session found on service-worker restore is credited at most
// up to lastSeenAt + this grace window (the heartbeat runs every minute,
// so 90s covers one missed beat). Anything beyond it is sleep/shutdown time.
const LAST_SEEN_GRACE_MS = 90 * 1000
// A heartbeat gap smaller than this is alarm jitter on an awake machine; a
// larger one means the machine slept. Worst case a real sleep just under the
// threshold credits five phantom minutes — bounded, and far better than
// truncating live sessions whenever Chrome throttles the alarm.
const SLEEP_GAP_MS = 5 * 60 * 1000

// Residual sanity cap for a dangling session when no heartbeat exists
// (e.g. first run after update) — never credit more than 4 hours.
const MAX_DANGLING_SESSION_SECONDS = 4 * 60 * 60

// URL prefixes that must never be tracked. Landing on one of these ends and
// clears any live session so it can't linger unclosed.
const UNTRACKED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'file://',
  'view-source:',
]

function isTrackableUrl(url: string): boolean {
  if (!url) return false
  return !UNTRACKED_URL_PREFIXES.some((prefix) => url.startsWith(prefix))
}

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

// The Chrome window that currently has focus. Tab events from any other
// window are ignored so background windows can't hijack the session.
// chrome.windows.WINDOW_ID_NONE means "no window focused" (blocks all tab
// events); null means "unknown" (lenient, so tracking can't silently break
// if the windows API fails at wake-up).
let _focusedWindowId: number | null = null

// Guard so restoreState runs its side effects exactly once per SW lifetime,
// even if both the module-level init and onStartup reach it.
let _restored = false

// Session transitions run one at a time. withStorageLock only serializes the
// individual storage writes, not the end-then-start pair that makes up a
// transition, and Chrome delivers tab/window/idle events concurrently. Two
// quick tab switches used to interleave like this: handler A has an entry to
// finalize (slow), handler B has nothing (fast); B starts tab B's session, then
// A's startSession lands last and overwrites it with tab A. Everything after
// that was credited to the wrong domain — and the handler with work to do is
// always the slow one, so fast switching hit it every time.
//
// Every exported entry point that can change the session goes through here.
// Nothing inside a locked section may await this lock again, or it deadlocks.
let sessionQueue: Promise<unknown> = Promise.resolve()

function withSessionLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = sessionQueue.then(fn, fn)
  // Keep the chain alive even if fn rejects
  sessionQueue = next.catch(() => undefined)
  return next
}

export function getInMemoryState(): TrackingState {
  return { ..._state }
}

// True unless we positively know every Chrome window lost focus. Unknown
// (null) stays lenient so tracking can't silently break if the windows API
// failed at wake-up — matching how tab events treat _focusedWindowId.
function isChromeFocused(): boolean {
  return _focusedWindowId !== chrome.windows.WINDOW_ID_NONE
}

function hasLiveSession(): boolean {
  return _state.sessionStartTime !== null && _state.activeDomain !== null
}

function clearSessionFields(): void {
  _state.sessionStartTime = null
  _state.activeTabId = null
  _state.activeDomain = null
  _state.activeUrl = null
  _state.activeTitle = null
  _state.activeCategory = null
}

// Restore state from chrome.storage on service worker startup.
// Idempotent: awaited via the single `ready` promise in index.ts.
export function restoreState(): Promise<void> {
  return withSessionLock(restore)
}

async function restore(): Promise<void> {
  if (_restored) return
  _restored = true

  const saved = await getTrackingState()
  const settings = await getSettings()
  // settings.trackingEnabled is the single source of truth for the master
  // switch — the persisted isTracking flag is only a mirror for the popup.
  _state = { ...saved, isTracking: settings.trackingEnabled }

  // Initialize focused-window tracking for this SW lifetime.
  try {
    const win = await chrome.windows.getLastFocused()
    _focusedWindowId = win.focused ? (win.id ?? null) : chrome.windows.WINDOW_ID_NONE
  } catch {
    _focusedWindowId = null
  }

  // Read the heartbeat BEFORE anything persists state: saveTrackingState()
  // refreshes last_seen_at on every write, so a persist here would erase the
  // proof of when the service worker actually died.
  const lastSeenAt = await getLastSeenAt()
  const now = Date.now()

  // A heartbeat inside the grace window means the SW was merely cycled out
  // while the user stayed on the page — Chrome kills an idle worker after
  // ~30s and the 1-minute alarm wakes it right back up. Banking the session
  // here would end it for good: startSession is only reachable from tab,
  // window and idle events, none of which fire while someone keeps reading,
  // so a 20-minute article used to be credited ~90 seconds.
  const workerMerelyCycled = lastSeenAt !== null && now - lastSeenAt <= LAST_SEEN_GRACE_MS

  // A longer gap is sleep or shutdown: finalize the dangling session.
  if (hasLiveSession() && !workerMerelyCycled) {
    const dangling = { ..._state }
    // Credit time only up to the last proof the SW was alive — never
    // wall-clock time that elapsed while the machine slept or was off.
    const endTime = lastSeenAt !== null ? Math.min(now, lastSeenAt + LAST_SEEN_GRACE_MS) : now

    // Consume the persisted session FIRST so a crash mid-restore (or any
    // second restore) can never finalize the same session twice.
    clearSessionFields()
    await persistState()

    const sessionStart = dangling.sessionStartTime as number
    const elapsedSec = Math.floor((endTime - sessionStart) / 1000)
    const cappedSec = Math.min(elapsedSec, MAX_DANGLING_SESSION_SECONDS)

    if (cappedSec >= MIN_DURATION_SECONDS) {
      await saveFinalizedEntry(dangling, sessionStart + cappedSec * 1000)
    }

    await resumeActiveTabSession()
  }

  await saveLastSeenAt(Date.now())
}

// Pick the session back up on whatever tab is in front right now. The session
// we just finalized belongs to a browsing stretch that is over; this one
// starts at NOW, so the sleep gap is never credited to either.
async function resumeActiveTabSession(): Promise<void> {
  // Same guards as the idle-active resume: a session started while Chrome is
  // in the background would accrue time no tab event can ever end.
  if (!_state.isTracking || _state.isIdle || !isChromeFocused()) return

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (activeTab?.id && activeTab.url) {
      await startSession(activeTab.id, activeTab.url, activeTab.title ?? '')
    }
  } catch {
    // Tabs may not be queryable this early after wake-up — the next tab or
    // focus event resumes tracking instead.
  }
}

// Build the entry for a finished session, split it at local midnight if it
// crosses one, save all parts, and refresh each affected day's aggregate.
async function saveFinalizedEntry(state: TrackingState, endTime: number): Promise<void> {
  if (state.sessionStartTime === null || !state.activeDomain) return
  const durationSec = Math.floor((endTime - state.sessionStartTime) / 1000)
  if (durationSec < MIN_DURATION_SECONDS) return

  const entry: TrackingEntry = {
    id: crypto.randomUUID(),
    domain: state.activeDomain,
    url: state.activeUrl ?? '',
    title: state.activeTitle ?? '',
    category: state.activeCategory ?? 'uncategorized',
    startTime: state.sessionStartTime,
    duration: durationSec,
    date: formatLocalDate(new Date(state.sessionStartTime)),
  }

  const parts = splitEntryAtMidnight(entry)
  for (const part of parts) {
    await saveEntry(part)
  }
  // Refresh the aggregate of every day the session touched
  const dirtyDates = [...new Set(parts.map((p) => p.date))]
  const today = getTodayDateString()
  for (const date of dirtyDates) {
    await recomputeAndSaveAggregate(date)
    // A midnight-crossing session can correct a PAST day's aggregate after
    // the 00:05 alarm already uploaded it without this tail — nothing else
    // re-enqueues that date, so the cloud row would under-report forever.
    // Today needs no nudge: it syncs tonight (or via manual "Sync now") like
    // any other live day.
    if (date < today) {
      await enqueueSyncDate(date)
    }
  }
}

async function persistState(): Promise<void> {
  await saveTrackingState(_state)
}

// Heartbeat — called by the 1-minute alarm to prove the SW is alive.
export async function recordHeartbeat(): Promise<void> {
  await saveLastSeenAt(Date.now())
}

// End the current active session, save the entry if long enough, and ALWAYS
// persist the cleared state so a SW restart can't resurrect a stale session.
async function endCurrentSession(): Promise<void> {
  const hadSession = _state.sessionStartTime !== null && _state.activeDomain !== null
  if (hadSession) {
    const snapshot = { ..._state }
    const sessionStart = snapshot.sessionStartTime as number
    // Audible tabs survive the idle check, so a session can run all night on
    // an autoplaying video. Cap it with the same 4-hour sanity limit used for
    // dangling sessions instead of writing a 9-hour entry.
    let endTime = Math.min(Date.now(), sessionStart + MAX_DANGLING_SESSION_SECONDS * 1000)

    // The SW can survive a machine sleep (an open popup port keeps it alive),
    // in which case nothing was killed for restoreState to clean up and
    // wall-clock "now" is hours past the last proof the user was there. Only
    // a LARGE heartbeat gap means sleep, though — Chrome may throttle the
    // 1-minute alarm past the 90s grace on a perfectly awake machine, and an
    // unconditional clamp would truncate a live event-free session (a long
    // audible video) every time that happens. Past the sleep threshold, clamp
    // to the last proof of life exactly as restoreState does.
    const lastSeenAt = await getLastSeenAt()
    if (lastSeenAt !== null && Date.now() - lastSeenAt > SLEEP_GAP_MS) {
      endTime = Math.min(endTime, lastSeenAt + LAST_SEEN_GRACE_MS)
    }

    clearSessionFields()
    await persistState()
    await saveFinalizedEntry(snapshot, endTime)
  } else {
    clearSessionFields()
    await persistState()
  }
}

// Start tracking a new tab/URL.
async function startSession(tabId: number, url: string, title: string): Promise<void> {
  // Skip browser-internal and local pages — clear any lingering session
  if (!isTrackableUrl(url) || url === 'about:blank') {
    clearSessionFields()
    await persistState()
    return
  }

  // Master switch: settings.trackingEnabled. No session may ever start
  // while tracking is off or the user is idle.
  const settings = await getSettings()
  _state.isTracking = settings.trackingEnabled
  if (!settings.trackingEnabled || _state.isIdle) {
    await persistState()
    return
  }

  const domain = extractDomain(url)
  if (!domain) {
    clearSessionFields()
    await persistState()
    return
  }

  const customRules = await getCustomRules()
  // categorizeUrl, not categorizeDomain: a path rule can only be decided from
  // the full URL, and domain-only matching silently ignores every one of them.
  // The URL is never stored beyond this device or sent anywhere.
  const category = categorizeUrl(url, customRules)

  _state.activeTabId = tabId
  _state.activeDomain = domain
  // Clamped here too, not only in saveEntry: this state is persisted verbatim
  // on every event, so an unclamped multi-KB URL would ride every write.
  _state.activeUrl = url.slice(0, MAX_URL_LENGTH)
  _state.activeTitle = title.slice(0, MAX_TITLE_LENGTH)
  _state.activeCategory = category
  _state.sessionStartTime = Date.now()
  await persistState()
}

// ─── Chrome Event Handlers ─────────────────────────────────────────────────

// Called when the user switches to a different tab.
export function handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): Promise<void> {
  return withSessionLock(() => switchToTab(activeInfo))
}

async function switchToTab(activeInfo: chrome.tabs.TabActiveInfo): Promise<void> {
  // Ignore tab switches in unfocused windows
  if (_focusedWindowId !== null && activeInfo.windowId !== _focusedWindowId) return

  await endCurrentSession()

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    await startSession(activeInfo.tabId, tab.url ?? '', tab.title ?? '')
  } catch {
    // Tab may no longer exist
  }
}

// Called when a tab's URL or title changes.
export function handleTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
): Promise<void> {
  return withSessionLock(() => applyTabUpdate(tabId, changeInfo, tab))
}

async function applyTabUpdate(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
): Promise<void> {
  // Only react to URL or title changes on the active tab of the focused window
  if (!tab.active) return
  if (_focusedWindowId !== null && tab.windowId !== _focusedWindowId) return
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
export function handleWindowFocusChanged(windowId: number): Promise<void> {
  return withSessionLock(() => applyWindowFocus(windowId))
}

async function applyWindowFocus(windowId: number): Promise<void> {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // All Chrome windows lost focus — pause tracking and block tab events
    _focusedWindowId = chrome.windows.WINDOW_ID_NONE
    await endCurrentSession()
  } else {
    _focusedWindowId = windowId
    // Regained focus — find the active tab and start tracking
    if (_state.isTracking && !_state.isIdle) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, windowId })
        if (activeTab?.id && activeTab.url) {
          await endCurrentSession()
          await startSession(activeTab.id, activeTab.url, activeTab.title ?? '')
        }
      } catch {
        // Ignore
      }
    }
  }
}

// Called when the user's idle state changes.
export function handleIdleStateChanged(newState: chrome.idle.IdleState): Promise<void> {
  return withSessionLock(() => applyIdleState(newState))
}

async function applyIdleState(newState: chrome.idle.IdleState): Promise<void> {
  if (newState === 'idle') {
    // Watching a video counts: if the active tab is playing audio, the user
    // is likely consuming media — keep the session alive.
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      if (activeTab?.audible && activeTab.id === _state.activeTabId) {
        return
      }
    } catch {
      // Fall through and treat as idle
    }
    _state.isIdle = true
    await endCurrentSession()
  } else if (newState === 'locked') {
    // Locked always ends the session, audio or not
    _state.isIdle = true
    await endCurrentSession()
  } else if (newState === 'active') {
    _state.isIdle = false
    // Resume tracking the current active tab, but only when there is nothing
    // to resume: an audible tab keeps its session alive across idle, and
    // restarting it would reset sessionStartTime and discard the watched time.
    // Chrome must also still be the focused app — otherwise the new session
    // would accrue time no tab event can ever end (they bail when unfocused).
    if (_state.isTracking && !hasLiveSession() && isChromeFocused()) {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
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

// Toggle tracking on/off. settings.trackingEnabled is the persistent master
// switch; _state.isTracking mirrors it for the popup display.
export function toggleTracking(): Promise<boolean> {
  return withSessionLock(async () => {
    const settings = await getSettings()
    const enabled = !settings.trackingEnabled
    await setTrackingEnabled(enabled)
    return enabled
  })
}

// Apply a new value of the master switch (from the toggle or the options
// page). Ends the live session when turning off; starts one when turning on.
export function applyTrackingEnabled(enabled: boolean): Promise<void> {
  return withSessionLock(() => setTrackingEnabled(enabled))
}

async function setTrackingEnabled(enabled: boolean): Promise<void> {
  const settings = await getSettings()
  if (settings.trackingEnabled !== enabled) {
    await saveSettings({ trackingEnabled: enabled })
  }
  _state.isTracking = enabled

  if (!enabled) {
    await endCurrentSession()
  } else if (_state.sessionStartTime !== null) {
    // Already tracking a session — don't restart it (that would reset the
    // elapsed time when the options page re-saves unchanged settings)
    await persistState()
  } else if (!isChromeFocused()) {
    // Chrome is in the background — starting a session now would accrue time
    // that no tab event can end. Wait for the window-focus event instead.
    await persistState()
  } else {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      if (activeTab?.id && activeTab.url) {
        await startSession(activeTab.id, activeTab.url, activeTab.title ?? '')
      } else {
        await persistState()
      }
    } catch {
      await persistState()
    }
  }
}

// Discard the in-flight session WITHOUT saving an entry. Used by
// DELETE_ALL_DATA so no new entry materializes right after a wipe.
export function discardCurrentSession(): Promise<void> {
  return withSessionLock(async () => {
    clearSessionFields()
    await persistState()
  })
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
