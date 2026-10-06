import { afterEach, describe, expect, it } from 'vitest'
import { dayLabel, headerDate } from './day-label'

const ORIGINAL_TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
})

describe('dayLabel', () => {
  // UTC-11 to UTC+14: a date read as UTC midnight would land on the 17th west
  // of Greenwich and give the wrong weekday.
  for (const zone of ['UTC', 'Pacific/Pago_Pago', 'America/Los_Angeles', 'Asia/Taipei', 'Pacific/Kiritimati']) {
    it(`names 2026-09-18 a Friday in ${zone}`, () => {
      process.env.TZ = zone
      expect(dayLabel('2026-09-18', 'en-US')).toBe('Friday, September 18')
      expect(dayLabel('2026-09-18', 'zh-TW')).toBe('9月18日星期五')
    })
  }

  it('keeps the day across a daylight-saving change', () => {
    process.env.TZ = 'America/Los_Angeles'
    expect(dayLabel('2026-03-08', 'en-US')).toBe('Sunday, March 8')
    expect(dayLabel('2026-11-01', 'en-US')).toBe('Sunday, November 1')
  })
})

describe('headerDate', () => {
  it('names the requested day first', () => {
    expect(headerDate('2026-09-10', ['2026-09-18', '2026-09-17'])).toBe('2026-09-10')
  })

  it('falls back to the newest synced day', () => {
    expect(headerDate(null, ['2026-09-18', '2026-09-17'])).toBe('2026-09-18')
  })

  it('leaves the day to the browser when nothing has synced, never the server clock', () => {
    expect(headerDate(null, [])).toBeNull()
  })
})
