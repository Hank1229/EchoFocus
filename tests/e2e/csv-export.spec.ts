import fs from 'node:fs'
import { test, expect, openExtensionPage, seedStorage, workerToday } from './support'

// A6: the CSV floors seconds to minutes the way the popup does. The seeded
// seconds are chosen so flooring and rounding disagree: 125s is 2m either
// way, 119s floors to 1m (rounds to 2m), 59s floors to 0m (rounds to 1m).
test('the CSV export shows the minutes the popup shows (A6)', async ({ extension }) => {
  const today = await workerToday(extension.worker)
  const aggregate = {
    date: today,
    totalSeconds: 303,
    productiveSeconds: 125,
    distractionSeconds: 119,
    neutralSeconds: 59,
    uncategorizedSeconds: 0,
    focusScore: 51,
    topDomains: [
      { domain: 'github.com', seconds: 125, category: 'productive' },
      { domain: 'youtube.com', seconds: 119, category: 'distraction' },
      { domain: 'gmail.com', seconds: 59, category: 'neutral' },
    ],
  }
  const earlier = { ...aggregate, date: '2026-10-01', totalSeconds: 3725, productiveSeconds: 3599, distractionSeconds: 66, neutralSeconds: 60, focusScore: 98 }
  await seedStorage(extension.worker, { language: 'en', [`aggregates:${today}`]: aggregate, 'aggregates:2026-10-01': earlier })

  const popup = await openExtensionPage(extension, 'src/popup/index.html')
  await expect(popup.getByText('github.com')).toBeVisible()
  // The label and its figure share the nearest div.
  const stat = (label: string) => popup.getByText(label, { exact: true }).locator('xpath=ancestor::div[1]')
  await expect(stat("Today's total")).toContainText('5m')
  await expect(stat('Productive')).toContainText('2m')
  await expect(stat('Breaks & browsing')).toContainText('1m')
  await expect(stat('Neutral')).toContainText('59s')
  await expect(popup.getByText('github.com').locator('..')).toContainText('2m')
  await expect(popup.getByText('youtube.com').locator('..')).toContainText('1m')
  await expect(popup.getByText('gmail.com').locator('..')).toContainText('59s')

  const options = await openExtensionPage(extension, 'src/options/index.html#privacy', { width: 900, height: 900 })
  const [download] = await Promise.all([
    options.waitForEvent('download'),
    options.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  // The filename carries the local date, like the rules export (A6).
  expect(download.suggestedFilename()).toBe(`echofocus-aggregates-${today}.csv`)
  const csv = fs.readFileSync((await download.path())!, 'utf8').trim().split('\n')
  expect(csv).toEqual([
    'date,totalMinutes,productiveMinutes,distractionMinutes,neutralMinutes,uncategorizedMinutes,focusScore',
    '2026-10-01,62,59,1,1,0,98',
    `${today},5,2,1,0,0,51`,
  ])
})
