import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'
import { POMODORO_ALARM, advance, refreshBadge, run, snapshot } from './pomodoro'

const NOW = new Date(2026, 2, 14, 9, 0, 0)

let chromeStub: ChromeStub

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

function minutesFromNow(minutes: number): number {
  return Date.now() + minutes * 60_000
}

describe('run', () => {
  it('start begins a focus round: endsAt, alarm, badge minutes', async () => {
    const result = await run('start')

    expect(result.phase).toBe('focusing')
    expect(result.endsAt).toBe(minutesFromNow(25))
    expect(result.pausedRemainingMs).toBeNull()
    expect(chromeStub.alarms.get(POMODORO_ALARM)).toEqual({ when: minutesFromNow(25) })
    expect(chromeStub.badgeText).toBe('25')
  })

  it('start is a no-op while a round is already running', async () => {
    await run('start')
    vi.setSystemTime(new Date(NOW.getTime() + 10 * 60_000))

    const result = await run('start')

    expect(result.endsAt).toBe(NOW.getTime() + 25 * 60_000)
  })

  it('reads durations from pomodoro_settings', async () => {
    chromeStub.store['pomodoro_settings'] = { focusMinutes: 50, breakMinutes: 10 }

    const result = await run('start')

    expect(result.endsAt).toBe(minutesFromNow(50))
    expect(result.focusMinutes).toBe(50)
    expect(result.breakMinutes).toBe(10)
  })

  it('pause freezes the remaining time and clears the alarm', async () => {
    await run('start')
    vi.setSystemTime(new Date(NOW.getTime() + 10 * 60_000))

    const result = await run('pause')

    expect(result.phase).toBe('focusing')
    expect(result.pausedRemainingMs).toBe(15 * 60_000)
    expect(chromeStub.alarms.has(POMODORO_ALARM)).toBe(false)
    expect(chromeStub.badgeText).toBe('15')
  })

  it('resume continues from the frozen remainder', async () => {
    await run('start')
    vi.setSystemTime(new Date(NOW.getTime() + 10 * 60_000))
    await run('pause')
    vi.setSystemTime(new Date(NOW.getTime() + 60 * 60_000))

    const result = await run('resume')

    expect(result.pausedRemainingMs).toBeNull()
    expect(result.endsAt).toBe(Date.now() + 15 * 60_000)
    expect(chromeStub.alarms.get(POMODORO_ALARM)).toEqual({ when: Date.now() + 15 * 60_000 })
  })

  it('skip during focus enters the break silently', async () => {
    await run('start')

    const result = await run('skip')

    expect(result.phase).toBe('break')
    expect(result.endsAt).toBe(minutesFromNow(5))
    expect(chromeStub.notifications).toHaveLength(0)
  })

  it('skip during break starts the next focus round', async () => {
    await run('start')
    await run('skip')

    const result = await run('skip')

    expect(result.phase).toBe('focusing')
    expect(result.endsAt).toBe(minutesFromNow(25))
  })

  it('stop returns to idle from any state and clears alarm and badge', async () => {
    await run('start')
    await run('pause')

    const result = await run('stop')

    expect(result).toMatchObject({ phase: 'idle', endsAt: null, pausedRemainingMs: null })
    expect(chromeStub.alarms.has(POMODORO_ALARM)).toBe(false)
    expect(chromeStub.badgeText).toBe('')
  })
})

describe('advance', () => {
  it('focus end notifies and rolls into the break', async () => {
    await run('start')
    vi.setSystemTime(new Date(NOW.getTime() + 25 * 60_000))

    await advance()

    const state = await snapshot()
    expect(state.phase).toBe('break')
    expect(state.endsAt).toBe(Date.now() + 5 * 60_000)
    expect(chromeStub.notifications).toHaveLength(1)
    expect(chromeStub.notifications[0].id).toBe('echofocus-pomodoro-focus-end')
    // A lingering same-id notification is replaced without re-alerting on
    // macOS, so the create must be preceded by a clear.
    expect(chromeStub.clearedNotificationIds).toContain('echofocus-pomodoro-focus-end')
    expect(chromeStub.alarms.get(POMODORO_ALARM)).toEqual({ when: Date.now() + 5 * 60_000 })
    expect(chromeStub.badgeText).toBe('5')
  })

  it('break end notifies and starts the next focus round', async () => {
    await run('start')
    await run('skip')
    vi.setSystemTime(new Date(NOW.getTime() + 5 * 60_000))

    await advance()

    const state = await snapshot()
    expect(state.phase).toBe('focusing')
    expect(chromeStub.notifications[0].id).toBe('echofocus-pomodoro-break-end')
  })

  it('a stale firing is ignored while idle or paused', async () => {
    await advance()
    expect((await snapshot()).phase).toBe('idle')

    await run('start')
    await run('pause')
    await advance()

    const state = await snapshot()
    expect(state.phase).toBe('focusing')
    expect(state.pausedRemainingMs).not.toBeNull()
    expect(chromeStub.notifications).toHaveLength(0)
  })

  it('localizes the notification copy', async () => {
    chromeStub.store['language'] = 'zh-TW'
    await run('start')
    vi.setSystemTime(new Date(NOW.getTime() + 25 * 60_000))

    await advance()

    expect(chromeStub.notifications[0].options.title).toBe('專注完成')
  })
})

describe('refreshBadge', () => {
  it('ticks the remaining minutes down', async () => {
    await run('start')
    vi.setSystemTime(new Date(NOW.getTime() + 90_000))

    await refreshBadge()

    expect(chromeStub.badgeText).toBe('24')
  })

  it('shows at least 1 until the phase actually ends', async () => {
    await run('start')
    vi.setSystemTime(new Date(NOW.getTime() + 25 * 60_000 - 1))

    await refreshBadge()

    expect(chromeStub.badgeText).toBe('1')
  })

  it('never touches the badge while the storage-full flag is set', async () => {
    chromeStub.store['storage_full_at'] = Date.now()
    chromeStub.badgeText = '!'

    await run('start')

    expect(chromeStub.badgeText).toBe('!')
  })

  it('treats a corrupt stored state as idle', async () => {
    chromeStub.store['pomodoro_state'] = { phase: 'warp', endsAt: 'later' }

    await refreshBadge()

    expect(chromeStub.badgeText).toBe('')
    expect((await snapshot()).phase).toBe('idle')
  })
})
