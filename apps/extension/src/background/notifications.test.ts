import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { DailyAggregate, Settings } from '@echofocus/shared'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'

vi.mock('./storage', () => ({
  getSettings: vi.fn(async () => ({ ...DEFAULT_SETTINGS })),
}))

import * as storage from './storage'
import {
  notifyDailySummary,
  openDailySummary,
  isDailySummaryEnabled,
  setDailySummaryEnabled,
} from './notifications'

const TODAY = '2026-03-14'
const GOAL_SECONDS = DEFAULT_SETTINGS.dailyGoalMinutes * 60

function aggregate(overrides: Partial<DailyAggregate> = {}): DailyAggregate {
  return {
    date: TODAY,
    totalSeconds: 6 * 3600,
    productiveSeconds: 3 * 3600 + 20 * 60,
    distractionSeconds: 40 * 60,
    neutralSeconds: 2 * 3600,
    uncategorizedSeconds: 0,
    topDomains: [],
    focusScore: 83,
    ...overrides,
  }
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides }
}

// Seeds stored aggregates that met the daily goal, so a streak exists.
function seedGoalMetDays(...dates: string[]) {
  for (const date of dates) {
    chromeStub.store[`aggregates:${date}`] = aggregate({ date, productiveSeconds: GOAL_SECONDS })
  }
}

let chromeStub: ChromeStub

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.clearAllMocks()
  vi.mocked(storage.getSettings).mockResolvedValue(settings())
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 14, 21, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('the enabled flag', () => {
  it('is off until the user turns it on', async () => {
    expect(await isDailySummaryEnabled()).toBe(false)
  })

  it('round-trips through its own storage key, outside `settings`', async () => {
    await setDailySummaryEnabled(true)
    expect(chromeStub.store.daily_summary_notifications).toBe(true)
    expect(chromeStub.store.settings).toBeUndefined()
    expect(await isDailySummaryEnabled()).toBe(true)

    await setDailySummaryEnabled(false)
    expect(await isDailySummaryEnabled()).toBe(false)
  })
})

describe('notifyDailySummary gating', () => {
  it('sends nothing while the flag is off (the default)', async () => {
    expect(await notifyDailySummary(TODAY, aggregate())).toBe(false)
    expect(chromeStub.notifications).toHaveLength(0)
  })

  it('sends nothing when tracking is disabled', async () => {
    await setDailySummaryEnabled(true)
    vi.mocked(storage.getSettings).mockResolvedValue(settings({ trackingEnabled: false }))

    expect(await notifyDailySummary(TODAY, aggregate())).toBe(false)
    expect(chromeStub.notifications).toHaveLength(0)
  })

  it('sends nothing when the day has no tracked time', async () => {
    await setDailySummaryEnabled(true)

    expect(await notifyDailySummary(TODAY, aggregate({ totalSeconds: 0, productiveSeconds: 0 }))).toBe(false)
    expect(chromeStub.notifications).toHaveLength(0)
  })

  it('sends once per day, not once per alarm', async () => {
    await setDailySummaryEnabled(true)

    expect(await notifyDailySummary(TODAY, aggregate())).toBe(true)
    expect(await notifyDailySummary(TODAY, aggregate())).toBe(false)
    expect(chromeStub.notifications).toHaveLength(1)
    expect(chromeStub.store.daily_summary_sent_on).toBe(TODAY)
  })

  it('sends again the next day', async () => {
    await setDailySummaryEnabled(true)
    await notifyDailySummary(TODAY, aggregate())

    vi.setSystemTime(new Date(2026, 2, 15, 21, 0, 0))
    expect(await notifyDailySummary('2026-03-15', aggregate({ date: '2026-03-15' }))).toBe(true)
    expect(chromeStub.notifications).toHaveLength(2)
    expect(chromeStub.store.daily_summary_sent_on).toBe('2026-03-15')
  })
})

describe('notification content', () => {
  beforeEach(async () => {
    await setDailySummaryEnabled(true)
  })

  it('reads the focus score and productive time in English by default', async () => {
    await notifyDailySummary(TODAY, aggregate({ focusScore: 83, productiveSeconds: 3 * 3600 + 20 * 60 }))

    const [sent] = chromeStub.notifications
    expect(sent.id).toBe('echofocus-daily-summary')
    expect(sent.options.title).toBe("Today's focus score: 83")
    expect(sent.options.message).toBe('3h 20m of productive time today.')
    expect(sent.options.type).toBe('basic')
    expect(sent.options.iconUrl).toContain('src/assets/icon-128.png')
  })

  it('follows the stored UI language', async () => {
    chromeStub.store.language = 'zh-TW'
    await notifyDailySummary(TODAY, aggregate({ focusScore: 71, productiveSeconds: 45 * 60 }))

    const [sent] = chromeStub.notifications
    expect(sent.options.title).toBe('今天的專注分數：71')
    expect(sent.options.message).toBe('今天累積 45m 專注時間。')
  })

  it('mentions a live goal streak', async () => {
    seedGoalMetDays('2026-03-11', '2026-03-12', '2026-03-13')
    await notifyDailySummary(TODAY, aggregate({ productiveSeconds: GOAL_SECONDS }))

    expect(chromeStub.notifications[0].options.message).toBe(
      '6h of productive time today — 4 days in a row.',
    )
  })

  it('mentions the streak in the chosen language too', async () => {
    chromeStub.store.language = 'zh-TW'
    seedGoalMetDays('2026-03-13')
    await notifyDailySummary(TODAY, aggregate({ productiveSeconds: GOAL_SECONDS }))

    expect(chromeStub.notifications[0].options.message).toBe('今天累積 6h 專注時間 — 已連續 2 天達標。')
  })

  it('stays quiet about a one-day streak', async () => {
    await notifyDailySummary(TODAY, aggregate({ productiveSeconds: GOAL_SECONDS }))

    expect(chromeStub.notifications[0].options.message).toBe('6h of productive time today.')
  })

  it('drops the streak line once a day below goal breaks the run', async () => {
    seedGoalMetDays('2026-03-11', '2026-03-13')
    chromeStub.store['aggregates:2026-03-12'] = aggregate({
      date: '2026-03-12',
      productiveSeconds: GOAL_SECONDS - 60,
    })
    await notifyDailySummary(TODAY, aggregate({ productiveSeconds: 2 * 3600 }))

    expect(chromeStub.notifications[0].options.message).toBe('2h of productive time today.')
  })
})

describe('openDailySummary', () => {
  it('dismisses the notification and opens the dashboard', async () => {
    await setDailySummaryEnabled(true)
    await notifyDailySummary(TODAY, aggregate())

    await openDailySummary('echofocus-daily-summary')

    expect(chromeStub.clearedNotificationIds).toEqual(['echofocus-daily-summary'])
    expect(chromeStub.createdTabUrls).toEqual(['https://echo-focus-web.vercel.app/dashboard/today'])
  })

  it('ignores clicks on notifications from anywhere else', async () => {
    await openDailySummary('some-other-notification')

    expect(chromeStub.clearedNotificationIds).toEqual([])
    expect(chromeStub.createdTabUrls).toEqual([])
  })
})
