import { cleanupOldData, recomputeAndSaveAggregate, getStorageInfo, saveAiAnalysis } from './storage'
import { getTodayDateString } from '@echofocus/shared'
import { syncYesterdayAggregate } from '../lib/sync'
import { requestAiAnalysis } from '../lib/ai'

const CLEANUP_ALARM = 'echofocus-cleanup'
const AGGREGATE_ALARM = 'echofocus-aggregate'
const SYNC_ALARM = 'echofocus-sync'
const AI_ALARM = 'echofocus-ai-daily'

// Set up all recurring alarms. Called on extension install and startup.
export async function setupAlarms(): Promise<void> {
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
  }
}

async function runCleanup(): Promise<void> {
  console.log('[EchoFocus] Running data cleanup...')
  await cleanupOldData()
  const info = await getStorageInfo()
  const usedMB = (info.usedBytes / 1024 / 1024).toFixed(2)
  console.log(`[EchoFocus] Storage usage: ${usedMB} MB / 10 MB`)
}

async function runAggregate(): Promise<void> {
  const today = getTodayDateString()
  await recomputeAndSaveAggregate(today)
}

async function runSync(): Promise<void> {
  console.log('[EchoFocus] Running nightly sync...')
  await syncYesterdayAggregate()
}

async function runAiAnalysis(): Promise<void> {
  const today = getTodayDateString()
  console.log('[EchoFocus] Running daily AI analysis for', today)
  const result = await requestAiAnalysis(today)
  if (result) {
    await saveAiAnalysis(today, result)
    console.log('[EchoFocus] AI analysis saved for', today)
  }
}
