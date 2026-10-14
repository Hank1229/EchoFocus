import { test, expect, openExtensionPage, openSite, waitForSession, trackingState, storage, entriesFor, workerToday, sleep } from './support'

// A2: only the focused tab's time is recorded. Three sites, a few seconds on
// each; the entries must match the dwell within a second, and the popup must
// show the same totals. Keeps to well under 30 seconds of real time.
const PLAN = [
  { url: 'https://github.com/', domain: 'github.com', category: 'productive', dwell: 8 },
  { url: 'https://www.youtube.com/watch?v=abc', domain: 'youtube.com', category: 'distraction', dwell: 6 },
  { url: 'https://en.wikipedia.org/wiki/Focus', domain: 'en.wikipedia.org', category: 'neutral', dwell: 7 },
]
const TOLERANCE_SECONDS = 1

test('tracks the focused tab only and the popup shows the recorded totals (A2)', async ({ extension }) => {
  const popup = await openExtensionPage(extension, 'src/popup/index.html')
  await expect(popup.getByText('No browsing activity recorded yet')).toBeVisible()

  const measured: number[] = []
  for (const step of PLAN) {
    await openSite(extension, step.url)
    const state = await waitForSession(extension.worker, step.url)
    expect(state.activeDomain).toBe(step.domain)
    expect(state.activeCategory).toBe(step.category)
    const from = Date.now()
    await sleep(step.dwell * 1000)
    measured.push((Date.now() - from) / 1000)
  }

  // While the last site is still live, the popup's Now row names it.
  await expect(popup.getByText('Now:').locator('..')).toContainText('en.wikipedia.org')

  // The popup is an untrackable URL: bringing it to the front ends the session.
  await popup.bringToFront()
  await expect.poll(async () => (await trackingState(extension.worker))?.activeDomain).toBeNull()

  const today = await workerToday(extension.worker)
  const entries = await entriesFor(extension.worker, today)
  expect(entries.map(e => [e.domain, e.category])).toEqual(PLAN.map(s => [s.domain, s.category]))
  entries.forEach((entry, i) => {
    expect(Math.abs(entry.duration - measured[i]!), `${entry.domain} recorded ${entry.duration}s for a ${measured[i]!.toFixed(1)}s dwell`)
      .toBeLessThanOrEqual(TOLERANCE_SECONDS)
  })

  const { [`aggregates:${today}`]: aggregate } = await storage(extension.worker, `aggregates:${today}`) as Record<string, {
    totalSeconds: number; productiveSeconds: number; distractionSeconds: number; neutralSeconds: number; focusScore: number
  }>
  const total = entries.reduce((sum, e) => sum + e.duration, 0)
  expect(aggregate.totalSeconds).toBe(total)
  expect(aggregate.productiveSeconds).toBe(entries[0]!.duration)
  expect(aggregate.distractionSeconds).toBe(entries[1]!.duration)
  expect(aggregate.neutralSeconds).toBe(entries[2]!.duration)

  // Under a minute every figure is shown in seconds, so the popup's numbers
  // are the aggregate's numbers verbatim.
  const body = popup.locator('body')
  await expect(body).toContainText(`${aggregate.totalSeconds}s`)
  await expect(body).toContainText(`${aggregate.productiveSeconds}s`)
  await expect(body).toContainText(`${aggregate.distractionSeconds}s`)
  await expect(body).toContainText(`${aggregate.neutralSeconds}s`)
  await expect(body).toContainText(String(aggregate.focusScore))
  for (const step of PLAN) await expect(body).toContainText(step.domain)
})
