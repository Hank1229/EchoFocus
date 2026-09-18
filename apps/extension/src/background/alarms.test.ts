import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { DailyAggregate } from '@echofocus/shared'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'

// The jobs the alarms trigger are unit-tested in their own files; here we only
// care about which alarm is scheduled how, and which job each one runs.
vi.mock('./storage', () => ({
  cleanupOldData: vi.fn(async () => undefined),
  recomputeAndSaveAggregate: vi.fn(async () => emptyAggregate('2026-03-14')),
  getStorageInfo: vi.fn(async () => ({ usedBytes: 1024, quotaBytes: 10485760 })),
  saveAiAnalysis: vi.fn(async () => undefined),
}))
vi.mock('../lib/sync', () => ({
  syncYesterdayAggregate: vi.fn(async () => undefined),
}))
vi.mock('../lib/ai', () => ({
  requestAiAnalysis: vi.fn(async () => null),
}))
vi.mock('./tracker', () => ({
  recordHeartbeat: vi.fn(async () => undefined),
}))
vi.mock('./notifications', () => ({
  notifyDailySummary: vi.fn(async () => false),
}))

import * as storage from './storage'
import * as sync from '../lib/sync'
import * as ai from '../lib/ai'
import * as tracker from './tracker'
import * as notifications from './notifications'
import { setupAlarms, ensureHeartbeatAlarm, handleAlarm } from './alarms'

function emptyAggregate(date: string, totalSeconds = 0): DailyAggregate {
  return {
    date,
    totalSeconds,
    productiveSeconds: totalSeconds,
    distractionSeconds: 0,
    neutralSeconds: 0,
    uncategorizedSeconds: 0,
    topDomains: [],
    focusScore: totalSeconds > 0 ? 100 : 0,
  }
}

function alarm(name: string): chrome.alarms.Alarm {
  return { name, scheduledTime: Date.now(), periodInMinutes: undefined } as chrome.alarms.Alarm
}

let chromeStub: ChromeStub

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.clearAllMocks()
  vi.mocked(storage.recomputeAndSaveAggregate).mockResolvedValue(emptyAggregate('2026-03-14'))
  vi.mocked(ai.requestAiAnalysis).mockResolvedValue({ ok: false, reason: 'unavailable' })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('setupAlarms', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0))
  })

  it('creates exactly the five expected alarms', async () => {
    await setupAlarms()
    expect([...chromeStub.alarms.keys()].sort()).toEqual([
      'echofocus-aggregate',
      'echofocus-ai-daily',
      'echofocus-cleanup',
      'echofocus-heartbeat',
      'echofocus-sync',
    ])
  })

  it('schedules the heartbeat every minute', async () => {
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-heartbeat')).toEqual({ periodInMinutes: 1 })
  })

  it('schedules cleanup daily, starting a minute after install', async () => {
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-cleanup')).toEqual({
      delayInMinutes: 1,
      periodInMinutes: 24 * 60,
    })
  })

  it('schedules the aggregate refresh hourly', async () => {
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-aggregate')).toEqual({
      delayInMinutes: 5,
      periodInMinutes: 60,
    })
  })

  // create() cancels and reschedules, and setupAlarms runs on every browser
  // start: rescheduling here pushed the 00:05 sync to "tomorrow" every single
  // morning for anyone who quits Chrome at night, so it never fired.
  it('leaves already-scheduled alarms alone on a second run', async () => {
    await setupAlarms()
    vi.setSystemTime(new Date(2026, 2, 15, 9, 0, 0)) // next morning
    await setupAlarms()

    for (const name of [
      'echofocus-sync',
      'echofocus-ai-daily',
      'echofocus-cleanup',
      'echofocus-aggregate',
      'echofocus-heartbeat',
    ]) {
      expect(chromeStub.alarmCreateCounts.get(name), name).toBe(1)
    }
  })

  // The overdue alarm is the whole point: Chrome fires a past-due alarm as
  // soon as it starts. Rescheduling it to the NEXT 00:05 is what made the
  // nightly sync of an evening-shutdown user never run.
  it('leaves an overdue 00:05 alarm overdue instead of pushing it to tomorrow', async () => {
    await setupAlarms() // 2026-03-14 10:00 → fires 2026-03-15 00:05
    const scheduled = chromeStub.alarms.get('echofocus-sync')?.when

    // Browser was shut down overnight and reopens after 00:05 has passed
    vi.setSystemTime(new Date(2026, 2, 15, 9, 0, 0))
    await setupAlarms()

    expect(chromeStub.alarms.get('echofocus-sync')?.when).toBe(scheduled)
    expect(scheduled).toBeLessThan(Date.now())
  })

  it('recreates an alarm that Chrome dropped', async () => {
    await setupAlarms()
    await chrome.alarms.clear('echofocus-sync')

    await setupAlarms()

    expect(chromeStub.alarms.has('echofocus-sync')).toBe(true)
    expect(chromeStub.alarmCreateCounts.get('echofocus-sync')).toBe(2)
  })
})

describe('daily sync scheduling (local time, not UTC)', () => {
  it('targets tomorrow 00:05 local when 00:05 has already passed today', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0))
    await setupAlarms()
    const when = chromeStub.alarms.get('echofocus-sync')?.when
    expect(when).toBe(new Date(2026, 2, 15, 0, 5, 0, 0).getTime())
    expect(new Date(when as number).getHours()).toBe(0)
    expect(new Date(when as number).getMinutes()).toBe(5)
  })

  it('targets today 00:05 local when the SW starts just after midnight', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 0, 2, 0))
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-sync')?.when).toBe(
      new Date(2026, 2, 14, 0, 5, 0, 0).getTime(),
    )
  })

  it('rolls to the next day when the clock is exactly 00:05', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 0, 5, 0, 0))
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-sync')?.when).toBe(
      new Date(2026, 2, 15, 0, 5, 0, 0).getTime(),
    )
  })

  it('crosses a month boundary correctly', async () => {
    vi.setSystemTime(new Date(2026, 1, 28, 23, 59, 0)) // 2026-02-28, non-leap year
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-sync')?.when).toBe(
      new Date(2026, 2, 1, 0, 5, 0, 0).getTime(),
    )
  })

  it('repeats every 24 hours', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0))
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-sync')?.periodInMinutes).toBe(24 * 60)
  })
})

describe('daily AI scheduling (local time, not UTC)', () => {
  it('targets 21:00 today when it has not passed yet', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0))
    await setupAlarms()
    const when = chromeStub.alarms.get('echofocus-ai-daily')?.when
    expect(when).toBe(new Date(2026, 2, 14, 21, 0, 0, 0).getTime())
    expect(new Date(when as number).getHours()).toBe(21)
  })

  it('targets 21:00 tomorrow when the evening has already passed', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 22, 30, 0))
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-ai-daily')?.when).toBe(
      new Date(2026, 2, 15, 21, 0, 0, 0).getTime(),
    )
  })

  it('repeats every 24 hours', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0))
    await setupAlarms()
    expect(chromeStub.alarms.get('echofocus-ai-daily')?.periodInMinutes).toBe(24 * 60)
  })
})

describe('ensureHeartbeatAlarm', () => {
  it('creates the heartbeat alarm when it is missing', async () => {
    await ensureHeartbeatAlarm()
    expect(chromeStub.alarms.has('echofocus-heartbeat')).toBe(true)
  })

  it('does not recreate an existing alarm (which would reset its schedule)', async () => {
    await ensureHeartbeatAlarm()
    await ensureHeartbeatAlarm()
    await ensureHeartbeatAlarm()
    expect(chromeStub.alarmCreateCounts.get('echofocus-heartbeat')).toBe(1)
  })
})

describe('handleAlarm dispatch', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0))
  })

  it('runs the cleanup job for the cleanup alarm', async () => {
    await handleAlarm(alarm('echofocus-cleanup'))
    expect(storage.cleanupOldData).toHaveBeenCalledTimes(1)
    expect(storage.getStorageInfo).toHaveBeenCalledTimes(1)
    expect(sync.syncYesterdayAggregate).not.toHaveBeenCalled()
  })

  it('recomputes TODAY\'s local aggregate for the aggregate alarm', async () => {
    await handleAlarm(alarm('echofocus-aggregate'))
    expect(storage.recomputeAndSaveAggregate).toHaveBeenCalledWith('2026-03-14')
  })

  it('uses the local date for the aggregate alarm late in the evening', async () => {
    vi.setSystemTime(new Date(2026, 2, 14, 23, 45, 0))
    await handleAlarm(alarm('echofocus-aggregate'))
    expect(storage.recomputeAndSaveAggregate).toHaveBeenCalledWith('2026-03-14')
  })

  it('drains the sync queue for the sync alarm', async () => {
    await handleAlarm(alarm('echofocus-sync'))
    expect(sync.syncYesterdayAggregate).toHaveBeenCalledTimes(1)
    expect(storage.cleanupOldData).not.toHaveBeenCalled()
  })

  it('records the heartbeat for the heartbeat alarm and nothing else', async () => {
    await handleAlarm(alarm('echofocus-heartbeat'))
    expect(tracker.recordHeartbeat).toHaveBeenCalledTimes(1)
    expect(storage.cleanupOldData).not.toHaveBeenCalled()
    expect(sync.syncYesterdayAggregate).not.toHaveBeenCalled()
    expect(ai.requestAiAnalysis).not.toHaveBeenCalled()
  })

  it('ignores an unknown alarm name', async () => {
    await handleAlarm(alarm('some-other-extension-alarm'))
    expect(storage.cleanupOldData).not.toHaveBeenCalled()
    expect(sync.syncYesterdayAggregate).not.toHaveBeenCalled()
    expect(ai.requestAiAnalysis).not.toHaveBeenCalled()
    expect(tracker.recordHeartbeat).not.toHaveBeenCalled()
  })
})

describe('the daily AI job', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 2, 14, 21, 0, 0))
  })

  it('skips analysis below 30 minutes of browsing', async () => {
    vi.mocked(storage.recomputeAndSaveAggregate).mockResolvedValue(
      emptyAggregate('2026-03-14', 30 * 60 - 1),
    )
    await handleAlarm(alarm('echofocus-ai-daily'))
    expect(ai.requestAiAnalysis).not.toHaveBeenCalled()
    expect(storage.saveAiAnalysis).not.toHaveBeenCalled()
  })

  it('runs analysis at exactly 30 minutes and stores the result under today', async () => {
    vi.mocked(storage.recomputeAndSaveAggregate).mockResolvedValue(
      emptyAggregate('2026-03-14', 30 * 60),
    )
    const result = { analysisText: 'Solid focus.', focusScore: 88, analyzedAt: Date.now() }
    vi.mocked(ai.requestAiAnalysis).mockResolvedValue({ ok: true, result })

    await handleAlarm(alarm('echofocus-ai-daily'))

    expect(ai.requestAiAnalysis).toHaveBeenCalledWith('2026-03-14', 'en')
    expect(storage.saveAiAnalysis).toHaveBeenCalledWith('2026-03-14', result)
  })

  it('passes the stored UI language through to the analysis request', async () => {
    chromeStub.store['language'] = 'zh-TW'
    vi.mocked(storage.recomputeAndSaveAggregate).mockResolvedValue(
      emptyAggregate('2026-03-14', 60 * 60),
    )
    await handleAlarm(alarm('echofocus-ai-daily'))
    expect(ai.requestAiAnalysis).toHaveBeenCalledWith('2026-03-14', 'zh-TW')
  })

  it('saves nothing when the analysis request fails', async () => {
    vi.mocked(storage.recomputeAndSaveAggregate).mockResolvedValue(
      emptyAggregate('2026-03-14', 60 * 60),
    )
    vi.mocked(ai.requestAiAnalysis).mockResolvedValue({ ok: false, reason: 'unavailable' })
    await handleAlarm(alarm('echofocus-ai-daily'))
    expect(storage.saveAiAnalysis).not.toHaveBeenCalled()
  })
})

describe('the daily summary notification', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 2, 14, 21, 0, 0))
  })

  it('is raised with today\'s freshly recomputed aggregate', async () => {
    const aggregate = emptyAggregate('2026-03-14', 4 * 3600)
    vi.mocked(storage.recomputeAndSaveAggregate).mockResolvedValue(aggregate)

    await handleAlarm(alarm('echofocus-ai-daily'))

    expect(notifications.notifyDailySummary).toHaveBeenCalledWith('2026-03-14', aggregate)
  })

  it('still goes out on a day too short for AI analysis', async () => {
    vi.mocked(storage.recomputeAndSaveAggregate).mockResolvedValue(
      emptyAggregate('2026-03-14', 10 * 60),
    )

    await handleAlarm(alarm('echofocus-ai-daily'))

    expect(notifications.notifyDailySummary).toHaveBeenCalledTimes(1)
    expect(ai.requestAiAnalysis).not.toHaveBeenCalled()
  })

  it('is not raised by any other alarm', async () => {
    await handleAlarm(alarm('echofocus-aggregate'))
    await handleAlarm(alarm('echofocus-sync'))
    await handleAlarm(alarm('echofocus-heartbeat'))

    expect(notifications.notifyDailySummary).not.toHaveBeenCalled()
  })
})
