import { describe, expect, it } from 'vitest'
import { calculateFocusScore, formatDuration } from '@echofocus/shared'
import { DAILY_INSIGHT, PREVIEW_TODAY, spreadOverHours, TODAY_HOURS, TODAY_ROW, TODAY_SITES, WEEK, WEEK_HOURS, WEEKLY_REVIEW } from './fixtures'

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)
const minutes = (seconds: number) => Math.round(seconds / 60)

// The demo is the first thing a reviewer reads; a total that disagrees with
// its own parts reads as a bug in the product.
describe('the demo day agrees with itself', () => {
  const total = TODAY_ROW.productive + TODAY_ROW.distraction + TODAY_ROW.neutral

  it('the site list adds up to the day total and to each category', () => {
    expect(sum(TODAY_SITES.map(s => s.seconds))).toBe(total)
    for (const category of ['productive', 'distraction', 'neutral'] as const) {
      expect(sum(TODAY_SITES.filter(s => s.category === category).map(s => s.seconds)), category).toBe(TODAY_ROW[category])
    }
  })

  it('the hour chart adds up to the productive time', () => {
    expect(TODAY_HOURS).toHaveLength(24)
    expect(sum(TODAY_HOURS)).toBe(TODAY_ROW.productive)
  })

  it('Trends shows the same today as Today', () => {
    expect(WEEK.at(-1)).toEqual(TODAY_ROW)
    expect(TODAY_ROW.date).toBe(PREVIEW_TODAY)
  })

  it('every score is the extension formula applied to that day', () => {
    for (const day of WEEK) {
      expect(day.score, day.date).toBe(calculateFocusScore(day.productive, day.distraction))
    }
  })

  it("the week's hour chart adds up to the week's productive time", () => {
    expect(sum(WEEK_HOURS)).toBe(sum(WEEK.map(d => d.productive)))
  })

  it('the daily insight quotes the day', () => {
    const hour = (h: number) => minutes(TODAY_HOURS[h])
    expect(DAILY_INSIGHT.en).toContain(`You tracked ${formatDuration(total)} today with a focus score of ${TODAY_ROW.score}.`)
    expect(DAILY_INSIGHT.en).toContain(`Productive time came to ${formatDuration(TODAY_ROW.productive)}`)
    expect(DAILY_INSIGHT.en).toContain(`${hour(8)} productive minutes in the 08:00 hour against ${hour(15)} in the 15:00 hour`)
    expect(DAILY_INSIGHT.en).toContain(`Breaks and browsing came to ${formatDuration(TODAY_ROW.distraction)}.`)

    const zh = (seconds: number) => `${Math.floor(seconds / 3600)} 小時 ${minutes(seconds % 3600)} 分`
    expect(DAILY_INSIGHT['zh-TW']).toContain(`今天共追蹤 ${zh(total)}，專注分數 ${TODAY_ROW.score}。`)
    expect(DAILY_INSIGHT['zh-TW']).toContain(`生產力時間 ${zh(TODAY_ROW.productive)}`)
    expect(DAILY_INSIGHT['zh-TW']).toContain(`08:00 那一小時有 ${hour(8)} 分鐘生產力時間，15:00 則有 ${hour(15)} 分鐘`)
    expect(DAILY_INSIGHT['zh-TW']).toContain(`休息與瀏覽共 ${zh(TODAY_ROW.distraction)}。`)

    // "the strongest stretch ran from 14:00 to 17:00": the best three hours in a row.
    const windows = TODAY_HOURS.slice(0, 22).map((_, h) => sum(TODAY_HOURS.slice(h, h + 3)))
    expect(windows.indexOf(Math.max(...windows))).toBe(14)
  })

  it('the weekly review quotes the week', () => {
    const average = Math.round(sum(WEEK.map(d => d.score)) / WEEK.length)
    const lowest = WEEK.reduce((low, d) => (d.score < low.score ? d : low))
    expect(WEEKLY_REVIEW.en).toContain(`Your average focus score this week was ${average}`)
    expect(WEEKLY_REVIEW['zh-TW']).toContain(`這週平均專注分數 ${average}`)
    expect(WEEK.filter(d => d.score >= 70)).toHaveLength(3)
    expect(lowest).toMatchObject({ date: '2026-09-14', score: 39 })
    expect(lowest.distraction).toBeGreaterThan(lowest.productive)
    // "09:00 to 10:00 ... one of your three strongest hours"
    const strongest = [...WEEK_HOURS.keys()].sort((a, b) => WEEK_HOURS[b] - WEEK_HOURS[a]).slice(0, 3)
    expect(strongest).toContain(9)
  })
})

describe('spreadOverHours', () => {
  it('lands on whole minutes that add up to the total', () => {
    const hours = spreadOverHours(3600 + 7 * 60, [1, 1, 1, 0])
    expect(hours.every(s => s % 60 === 0)).toBe(true)
    expect(sum(hours)).toBe(3600 + 7 * 60)
    expect(hours[3]).toBe(0)
  })
})
