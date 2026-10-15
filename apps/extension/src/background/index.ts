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
  reclassifyToday,
} from './tracker'
import { applySettings } from './settings'
import { setupAlarms, ensureHeartbeatAlarm, handleAlarm } from './alarms'
import { openDailySummary } from './notifications'
import { partialSettingsSchema, classificationRuleArraySchema, dateStringSchema, aiAnalysisRequestSchema, pomodoroCommandSchema, pomodoroDurationsSchema } from '../lib/schemas'
import * as pomodoro from './pomodoro'
import { requestAiAnalysis } from '../lib/ai'
import { getTodayDateString } from '@echofocus/shared'
import { drainSyncQueue, enqueueMissedSyncDates, backfillHistoryIfNeeded, postSignInBootstrap } from '../lib/sync'
import { pushRules, pushSettings, pushSettingsSoon, reconcileWithCloud, reconcileIfStale, pullInstantPrefs } from '../lib/prefs-sync'
import { LINKED_USER_KEY, signInSilently, signInWithGoogle, signOut, verifySessionAlive } from '../lib/auth'
import { accountUserId } from '../lib/account-email'
import { DASHBOARD_ORIGINS } from '../lib/config'
import { decideConnect, isAllowedSender, type ConnectDecision } from '../lib/handoff'
import { dashboardMessageSchema } from '../lib/schemas'
import { isSignInPending } from '../lib/signin-flag'

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
  | 'SET_POMODORO_DURATIONS'
  | 'SIGN_IN'
  | 'REFRESH_CLOUD_PREFS'

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
  // A sign-in flow lives in one worker's memory; a flag this worker finds on
  // waking belongs to a flow that died with the previous one.
  await chrome.storage.local.remove('signin_in_progress')
  await restoreState()
  await ensureHeartbeatAlarm()
  // A device signed in before linked_user existed has a session and no
  // marker; without one, the device-linked-elsewhere refusal would let any
  // account in after the next sign-out.
  const stored = await chrome.storage.local.get(['supabase_session', LINKED_USER_KEY])
  const sessionUserId = accountUserId(stored.supabase_session)
  if (sessionUserId && typeof stored[LINKED_USER_KEY] !== 'string') {
    await chrome.storage.local.set({ [LINKED_USER_KEY]: sessionUserId })
  }
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
        sendResponse({ success: false, error: 'Something went wrong. Please try again or reload the extension.' })
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
        return { success: false, error: 'Invalid rules: each rule needs a pattern, match type, and category' }
      }
      await saveCustomRules(parsed.data)
      try {
        await reclassifyToday(parsed.data)
      } catch (err) {
        // The rules are saved; today's dots catch up on the next recorded entry.
        console.error('[EchoFocus] Reclassifying today failed:', err)
      }
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
        return { success: false, error: 'Invalid request: a date (YYYY-MM-DD) is required' }
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

    case 'REFRESH_CLOUD_PREFS': {
      // The open popup polls this so a dashboard save (theme, durations)
      // lands within a tick instead of waiting for a reopen.
      await pullInstantPrefs()
      return { success: true }
    }

    case 'SIGN_IN': {
      // Answer immediately: the popup that asked is about to close when the
      // OAuth window takes focus. The flow finishes here in the worker; the
      // popup reads signin_in_progress / the stored session when it reopens.
      void signIn()
      return { success: true }
    }

    case 'GET_POMODORO': {
      // Every popup open lands here — piggyback a throttled cloud pull so
      // dashboard edits (durations, theme) are fresh before a round starts.
      // Fire-and-forget: the popup must not wait on the network.
      void reconcileIfStale().catch(() => undefined)
      void pullInstantPrefs().catch(() => undefined)
      void verifySessionAlive().catch(() => undefined)
      return { success: true, data: await pomodoro.snapshot() }
    }

    case 'POMODORO_COMMAND': {
      const parsed = pomodoroCommandSchema.safeParse(message.payload)
      if (!parsed.success) {
        return { success: false, error: 'Invalid pomodoro command' }
      }
      return { success: true, data: await pomodoro.run(parsed.data) }
    }

    case 'SET_POMODORO_DURATIONS': {
      const parsed = pomodoroDurationsSchema.safeParse(message.payload)
      if (!parsed.success) {
        return { success: false, error: 'Invalid pomodoro durations' }
      }
      const snapshot = await pomodoro.setDurations(parsed.data)
      if (!snapshot) {
        return { success: false, error: 'Durations can only change while the timer is idle' }
      }
      await pushSettingsSoon()
      return { success: true, data: snapshot }
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` }
  }
}

// ─── Sign-in ──────────────────────────────────────────────────────────────

let signInInFlight: Promise<unknown> | null = null

// One flow at a time, whoever started it: the popup, onboarding, or the
// dashboard's link. signin_in_progress tells pages a flow is running.
function holdSignIn<T>(run: () => Promise<T>): Promise<T> {
  const flow = (async () => {
    await chrome.storage.local.set({ signin_in_progress: Date.now() })
    try {
      return await run()
    } finally {
      await chrome.storage.local.remove('signin_in_progress')
      signInInFlight = null
    }
  })()
  signInInFlight = flow
  return flow
}

async function bootstrapAfterSignIn(): Promise<void> {
  try {
    await postSignInBootstrap()
  } catch (err) {
    console.error('[EchoFocus] Post-sign-in bootstrap failed:', err)
  }
}

// A popup reopened mid-flow joins the running one instead of asking Chrome
// for a second, which it refuses.
function signIn(): Promise<unknown> {
  if (signInInFlight) return signInInFlight
  return holdSignIn(async () => {
    const outcome = await signInWithGoogle()
    if ('session' in outcome) await bootstrapAfterSignIn()
  })
}

// ─── Dashboard link (externally_connectable) ──────────────────────────────

type DashboardReply =
  | { ok: true; version: string; signedIn: boolean; sameAccount: boolean | null }
  | { ok: true }
  | { ok: false; reason: Exclude<ConnectDecision, 'proceed'> | 'bad-request' | 'failed' | 'mismatch' }

// A sender outside the dashboard origins gets no answer at all. Chrome
// already limits who can reach this listener to the manifest's matches; the
// check here keeps the two from drifting apart.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isAllowedSender(sender, DASHBOARD_ORIGINS)) return false
  answerDashboard(message)
    .then(sendResponse)
    .catch((err) => {
      console.error('[EchoFocus] Dashboard message failed:', err)
      sendResponse({ ok: false, reason: 'failed' })
    })
  return true
})

// The page learns whether this extension is signed in and whether that is
// the page's own account. Never an email, a user id, a token, or tracking data.
export async function answerDashboard(message: unknown): Promise<DashboardReply> {
  await ready
  const parsed = dashboardMessageSchema.safeParse(message)
  if (!parsed.success) return { ok: false, reason: 'bad-request' }
  const request = parsed.data

  const stored = await chrome.storage.local.get(['supabase_session', LINKED_USER_KEY, 'signin_in_progress'])
  const sessionUserId = accountUserId(stored.supabase_session)

  if (request.type === 'ECHOFOCUS_STATUS') {
    return {
      ok: true,
      version: chrome.runtime.getManifest().version,
      signedIn: sessionUserId !== null,
      sameAccount: sessionUserId === null ? null : sessionUserId === request.userId,
    }
  }

  const linked = stored[LINKED_USER_KEY]
  const decision = decideConnect({
    sessionUserId,
    linkedUser: typeof linked === 'string' ? linked : null,
    requestedUserId: request.userId,
    busy: signInInFlight !== null || isSignInPending(stored.signin_in_progress),
  })
  if (decision !== 'proceed') return { ok: false, reason: decision }

  const reply = await holdSignIn(() => connectAs(request.userId, request.email))
  // Answer the page now; the history upload can take a few seconds.
  if (reply.ok) void bootstrapAfterSignIn()
  return reply
}

// Signs in with the browser's current Google account and keeps the session
// only when it is the account the dashboard is signed in to.
async function connectAs(userId: string, email: string): Promise<DashboardReply> {
  const outcome = await signInSilently(email)
  if (!('session' in outcome)) return { ok: false, reason: outcome.failure === 'busy' ? 'busy' : 'failed' }
  if (outcome.session.user.id !== userId) {
    await signOut()
    return { ok: false, reason: 'mismatch' }
  }
  await chrome.storage.local.set({ [LINKED_USER_KEY]: userId })
  return { ok: true }
}

// Keep service worker alive during message handling (belt-and-suspenders)
chrome.runtime.onConnect.addListener(() => {
  // Connection from popup keeps SW alive while popup is open
})
