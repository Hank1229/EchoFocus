import { afterEach, describe, expect, it } from 'vitest'
import { insightLanguage } from './insight-language'
import { nextDailyReset, nextWeeklyReset, resetPhrase } from './quota-reset'

const ORIGINAL_TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
})

// Tuesday 2026-10-06, 10:00 UTC.
const NOW = new Date(Date.UTC(2026, 9, 6, 10, 0))

function daily(zone: string, language: 'en' | 'zh-TW', now = NOW): string {
  process.env.TZ = zone
  return resetPhrase(nextDailyReset(now), now, language)
}

function weekly(zone: string, language: 'en' | 'zh-TW', now = NOW): string {
  process.env.TZ = zone
  return resetPhrase(nextWeeklyReset(now), now, language)
}

describe('the daily reset, in the reader\'s own time', () => {
  it('is tonight at 7 in Chicago', () => {
    expect(daily('America/Chicago', 'zh-TW')).toBe('今晚 7:00')
    expect(daily('America/Chicago', 'en')).toBe('7:00 PM tonight')
  })

  it('is tomorrow morning at 8 in Taipei', () => {
    expect(daily('Asia/Taipei', 'zh-TW')).toBe('明天早上 8:00')
    expect(daily('Asia/Taipei', 'en')).toBe('8:00 AM tomorrow')
  })

  it('keeps the half hour in Kolkata', () => {
    expect(daily('Asia/Kolkata', 'zh-TW')).toBe('明天早上 5:30')
    expect(daily('Asia/Kolkata', 'en')).toBe('5:30 AM tomorrow')
  })

  it('is this afternoon in Los Angeles and small hours in London', () => {
    expect(daily('America/Los_Angeles', 'zh-TW')).toBe('今天下午 5:00')
    expect(daily('America/Los_Angeles', 'en')).toBe('5:00 PM today')
    expect(daily('Europe/London', 'zh-TW')).toBe('明天凌晨 1:00')
    expect(daily('Europe/London', 'en')).toBe('1:00 AM tomorrow')
  })

  it('names the next UTC midnight even right after one', () => {
    const justAfter = new Date(Date.UTC(2026, 9, 6, 0, 1))
    expect(nextDailyReset(justAfter).toISOString()).toBe('2026-10-07T00:00:00.000Z')
  })
})

describe('the weekly reset, Monday 00:00 UTC', () => {
  it('falls on Monday for a Tuesday reader', () => {
    expect(nextWeeklyReset(NOW).toISOString()).toBe('2026-10-12T00:00:00.000Z')
  })

  it('is a weekday and a time, in each zone', () => {
    expect(weekly('Asia/Taipei', 'zh-TW')).toBe('週一早上 8:00')
    expect(weekly('Asia/Taipei', 'en')).toBe('8:00 AM on Monday')
    expect(weekly('America/Chicago', 'zh-TW')).toBe('週日晚上 7:00')
    expect(weekly('America/Chicago', 'en')).toBe('7:00 PM on Sunday')
  })

  it('says tonight or today when the reset lands on the reader\'s own today', () => {
    // Sunday 2026-10-11, 20:00 UTC: Sunday afternoon in Chicago and Los
    // Angeles, while Monday 00:00 UTC is still ahead the same evening.
    const sunday = new Date(Date.UTC(2026, 9, 11, 20, 0))
    expect(weekly('America/Chicago', 'zh-TW', sunday)).toBe('今晚 7:00')
    expect(weekly('America/Chicago', 'en', sunday)).toBe('7:00 PM tonight')
    expect(weekly('America/Los_Angeles', 'zh-TW', sunday)).toBe('今天下午 5:00')
    expect(weekly('America/Los_Angeles', 'en', sunday)).toBe('5:00 PM today')
  })

  it('says next week when the reset lands on the same weekday', () => {
    // Monday 2026-10-05, 01:00 UTC: the next reset is a full week away.
    const monday = new Date(Date.UTC(2026, 9, 5, 1, 0))
    expect(weekly('UTC', 'zh-TW', monday)).toBe('下週一凌晨 12:00')
    expect(weekly('UTC', 'en', monday)).toBe('12:00 AM next Monday')
  })
})

describe('insightLanguage', () => {
  it('reads Han characters as Chinese and their absence as English', () => {
    expect(insightLanguage('今天共追蹤 8 小時 37 分，專注分數 76。')).toBe('zh-TW')
    expect(insightLanguage('You tracked 8h 37m today on github.com.')).toBe('en')
  })
})
