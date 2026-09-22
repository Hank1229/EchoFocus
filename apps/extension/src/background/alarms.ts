import { cleanupOldData, recomputeAndSaveAggregate, getStorageInfo, saveAiAnalysis } from './storage'
import { getTodayDateString } from '@echofocus/shared'
import { syncYesterdayAggregate } from '../lib/sync'
import { requestAiAnalysis } from '../lib/ai'
import { recordHeartbeat } from './tracker'
import { notifyDailySummary } from './notifications'
import * as pomodoro from './pomodoro'

const CLEANUP_ALARM = 'echofocus-cleanup'
const AGGREGATE_ALARM = 'echofocus-aggregate'
const SYNC_ALARM = 'echofocus-sync'
const AI_ALARM = 'echofocus-ai-daily'
const HEARTBEAT_ALARM = 'echofocus-heartbeat'

// Set up all recurring alarms. Called on extension install and startup.
export async function setupAlarms(): Promise<void> {
  // 1-minute heartbeat — persists lastSeenAt so a dangling session found on
  // SW restore is never credited with sleep/shutdown time
  await ensureHeartbeatAlarm()

  // Daily cleanup — runs every 24 hours
  await ensureAlarm(CLEANUP_ALARM, {
    delayInMinutes: 1,          // First run 1 min after install
    periodInMinutes: 24 * 60,   // Then every 24 hours
  })

  // Hourly aggregate refresh — keeps today's aggregate fresh
  await ensureAlarm(AGGREGATE_ALARM, {
    delayInMinutes: 5,
    periodInMinutes: 60,
  })

  // Daily sync at 00:05 — posts yesterday's aggregate to Supabase
  await ensureAlarm(SYNC_ALARM, {
    when: nextMidnightPlus5Minutes(),
    periodInMinutes: 24 * 60,
  })

  // 21:00 — daily summary notification plus the AI analysis of today's browsing
  await ensureAlarm(AI_ALARM, {
    when: next9PM(),
    periodInMinutes: 24 * 60,
  })

  console.log('[EchoFocus] Alarms set up')
}

// chrome.alarms.create() CANCELS any pending alarm of the same name and
// reschedules it from scratch. Alarms already survive browser restarts, so
// re-creating them on every onStartup only ever pushes them further out: a
// user who quits Chrome every evening moved the 00:05 sync to "tomorrow"
// every single morning, and it never fired once. Create only what is missing.
async function ensureAlarm(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void> {
  const existing = await chrome.alarms.get(name)
  if (!existing) {
    await chrome.alarms.create(name, info)
  }
}

// Make sure the heartbeat alarm exists. Called from setupAlarms and from the
// module-level init on every SW wake (alarms persist, but this covers users
// who installed before the heartbeat existed).
export async function ensureHeartbeatAlarm(): Promise<void> {
  await ensureAlarm(HEARTBEAT_ALARM, { periodInMinutes: 1 })
}

// Returns the timestamp (ms) for the next 00:05 local time.
function nextMidnightPlus5Minutes(): number {
  const now = new Date()
  const next = new Date(now)
  next.setHours(0, 5, 0, 0)
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime()
}

// Returns the timestamp (ms) for the next 21:00 local time.
function next9PM(): number {
  const now = new Date()
  const next = new Date(now)
  next.setHours(21, 0, 0, 0)
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime()
}

// Handle an alarm firing.
export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  switch (alarm.name) {
    case CLEANUP_ALARM:
      await runCleanup()
      break

    case AGGREGATE_ALARM:
      await runAggregate()
      break

    case SYNC_ALARM:
      await runSync()
      break

    case AI_ALARM:
      await runEveningSummary()
      break

    case HEARTBEAT_ALARM:
      await recordHeartbeat()
      // Piggyback the badge's minute countdown on the existing 1-minute tick.
      await pomodoro.refreshBadge()
      break

    case pomodoro.POMODORO_ALARM:
      await pomodoro.advance()
      break
  }
}

async function runCleanup(): Promise<void> {
  console.log('[EchoFocus] Running data cleanup...')
  await cleanupOldData()
  const info = await getStorageInfo()
  const usedMB = (info.usedBytes / 1024 / 1024).toFixed(2)
  const quotaMB = (info.quotaBytes / 1024 / 1024).toFixed(0)
  console.log(`[EchoFocus] Storage usage: ${usedMB} MB / ${quotaMB} MB`)
}

async function runAggregate(): Promise<void> {
  const today = getTodayDateString()
  await recomputeAndSaveAggregate(today)
}

async function runSync(): Promise<void> {
  console.log('[EchoFocus] Running nightly sync...')
  // Enqueues yesterday and drains the whole pending queue — days that
  // failed on previous nights are retried until confirmed synced.
  await syncYesterdayAggregate()
}

// The notification goes out for any day with data; the AI analysis needs
// enough of a day behind it to say something useful.
async function runEveningSummary(): Promise<void> {
  const today = getTodayDateString()
  const aggregate = await recomputeAndSaveAggregate(today)

  // The AI analysis below is the important half of this alarm — a notification
  // failure must not cost the user their daily insight.
  try {
    await notifyDailySummary(today, aggregate)
  } catch (err) {
    console.error('[EchoFocus] Daily summary notification failed:', err)
  }

  console.log('[EchoFocus] Running daily AI analysis for', today)
  if (aggregate.totalSeconds < 30 * 60) {
    console.log('[EchoFocus] Insufficient data, skipping AI analysis')
    return
  }

  const { language = 'en' } = await chrome.storage.local.get('language')
  const outcome = await requestAiAnalysis(today, language as string)
  if (outcome.ok) {
    await saveAiAnalysis(today, outcome.result)
    console.log('[EchoFocus] AI analysis saved for', today)
  } else {
    console.warn('[EchoFocus] AI analysis skipped:', outcome.reason)
  }
}
