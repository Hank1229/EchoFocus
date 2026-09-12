import { cleanupOldData, recomputeAndSaveAggregate, getStorageInfo, saveAiAnalysis } from './storage'
import { getTodayDateString } from '@echofocus/shared'
import { syncYesterdayAggregate } from '../lib/sync'
import { requestAiAnalysis } from '../lib/ai'
import { recordHeartbeat } from './tracker'

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
  await chrome.alarms.create(CLEANUP_ALARM, {
    delayInMinutes: 1,          // First run 1 min after install
    periodInMinutes: 24 * 60,   // Then every 24 hours
  })

  // Hourly aggregate refresh — keeps today's aggregate fresh
  await chrome.alarms.create(AGGREGATE_ALARM, {
    delayInMinutes: 5,
    periodInMinutes: 60,
  })

  // Daily sync at 00:05 — posts yesterday's aggregate to Supabase
  await chrome.alarms.create(SYNC_ALARM, {
    when: nextMidnightPlus5Minutes(),
    periodInMinutes: 24 * 60,
  })

  // Daily AI analysis at 21:00 — analyses today's browsing after a full day
  await chrome.alarms.create(AI_ALARM, {
    when: next9PM(),
    periodInMinutes: 24 * 60,
  })

  console.log('[EchoFocus] Alarms set up')
}

// Make sure the heartbeat alarm exists. Called from setupAlarms and from the
// module-level init on every SW wake (alarms persist, but this covers users
// who installed before the heartbeat existed).
export async function ensureHeartbeatAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(HEARTBEAT_ALARM)
  if (!existing) {
    await chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 1 })
  }
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
      await runAiAnalysis()
      break

    case HEARTBEAT_ALARM:
      await recordHeartbeat()
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

async function runAiAnalysis(): Promise<void> {
  const today = getTodayDateString()
  console.log('[EchoFocus] Running daily AI analysis for', today)

  // Guard: skip if less than 30 minutes of browsing data — avoids misleading analysis
  const aggregate = await recomputeAndSaveAggregate(today)
  if (aggregate.totalSeconds < 30 * 60) {
    console.log('[EchoFocus] Insufficient data, skipping AI analysis')
    return
  }

  const { language = 'en' } = await chrome.storage.local.get('language')
  const result = await requestAiAnalysis(today, language as string)
  if (result) {
    await saveAiAnalysis(today, result)
    console.log('[EchoFocus] AI analysis saved for', today)
  }
}
