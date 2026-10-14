import { test, expect, openExtensionPage, openSite, waitForSession, seedStorage, storage, entriesFor, workerToday, sleep } from './support'

// A7: "Delete all tracking data" removes every browsing record and nothing
// else, and tracking carries on afterwards.
const DELETED = ['aggregates:2026-10-01', 'entries:2026-10-01', 'ai_analysis:2026-10-01', 'daily_summary_sent_on']
const KEPT = ['custom_rules', 'language', 'pomodoro_settings', 'settings']

test('deleting local data removes browsing records, keeps settings, and tracking resumes (A7)', async ({ extension }) => {
  const today = await workerToday(extension.worker)
  await seedStorage(extension.worker, {
    language: 'en',
    custom_rules: [{ id: 'r1', pattern: 'notion.so', matchType: 'exact', category: 'productive', isDefault: false, createdAt: 1 }],
    settings: { trackingEnabled: true, idleTimeoutMinutes: 3, dataRetentionDays: 30, dailyGoalMinutes: 240 },
    pomodoro_settings: { focusMinutes: 50, breakMinutes: 10 },
    'aggregates:2026-10-01': { date: '2026-10-01', totalSeconds: 600, productiveSeconds: 600, distractionSeconds: 0, neutralSeconds: 0, uncategorizedSeconds: 0, focusScore: 100, topDomains: [{ domain: 'github.com', seconds: 600, category: 'productive' }] },
    'entries:2026-10-01': [{ id: 'e1', domain: 'github.com', url: 'https://github.com/', title: 'GitHub', category: 'productive', startTime: 1759276800000, duration: 600, date: '2026-10-01' }],
    'ai_analysis:2026-10-01': { analysisText: 'hello', focusScore: 100, analyzedAt: 1759276800000 },
    daily_summary_sent_on: '2026-10-01',
  })

  // Some real time today, then a session still open when delete is pressed.
  const popup = await openExtensionPage(extension, 'src/popup/index.html')
  await expect(popup.locator('footer')).toBeVisible()
  await openSite(extension, 'https://github.com/')
  await waitForSession(extension.worker, 'https://github.com/')
  await sleep(6000)
  const site = await openSite(extension, 'https://www.youtube.com/')
  await waitForSession(extension.worker, 'https://www.youtube.com/')
  await expect.poll(async () => (await entriesFor(extension.worker, today)).length).toBe(1)

  const options = await openExtensionPage(extension, 'src/options/index.html#privacy', { width: 900, height: 900 })
  await options.getByRole('button', { name: 'Delete all tracking data' }).click()
  await expect(options.getByText('Start fresh?')).toBeVisible()
  await options.getByRole('button', { name: 'Confirm delete' }).click()
  await expect(options.getByText('All tracking data deleted')).toBeVisible()

  const after = await storage(extension.worker, null)
  for (const key of DELETED) expect(after, key).not.toHaveProperty(key)
  expect(after).not.toHaveProperty(`entries:${today}`)
  expect(after).not.toHaveProperty(`aggregates:${today}`)
  for (const key of KEPT) expect(after, key).toHaveProperty(key)
  expect(after.settings).toMatchObject({ idleTimeoutMinutes: 3, dataRetentionDays: 30, dailyGoalMinutes: 240 })
  expect(after.pomodoro_settings).toEqual({ focusMinutes: 50, breakMinutes: 10 })
  expect((after.tracking_state as { isTracking: boolean }).isTracking).toBe(true)

  await expect(popup.getByText('No browsing activity recorded yet')).toBeVisible()
  await expect(popup.getByRole('spinbutton', { name: 'Focus' })).toHaveAttribute('aria-valuenow', '50')

  // Tracking resumes: the live session that was discarded leaves nothing
  // behind, and the next stretch on the site is recorded afresh.
  await site.bringToFront()
  await waitForSession(extension.worker, 'https://www.youtube.com/')
  await sleep(6000)
  await popup.bringToFront()
  await expect.poll(async () => (await entriesFor(extension.worker, today)).map(e => e.domain)).toEqual(['youtube.com'])
})
