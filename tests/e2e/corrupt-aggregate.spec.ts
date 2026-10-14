import { test, expect, openExtensionPage, seedStorage, workerToday, collectErrors } from './support'

// A11: a corrupt aggregates:<today> value must read as "no data for today",
// never as NaN minutes or one-character site rows, and never as a console
// error. The four shapes are the ones from the 2026-10-13 user test.
const VARIANTS = [
  { name: 'a string', value: 'not json {' },
  { name: 'an object missing most fields', value: { date: 'x', totalSeconds: 120 } },
  {
    name: 'an object with the wrong field types',
    value: { totalSeconds: 'lots', productiveSeconds: null, distractionSeconds: 5, neutralSeconds: 5, uncategorizedSeconds: 0, focusScore: 'high', topDomains: 'github.com', productiveByHour: [1, 2] },
  },
  {
    name: 'a well-formed aggregate whose topDomains is null',
    value: { totalSeconds: 100, productiveSeconds: 50, distractionSeconds: 50, neutralSeconds: 0, uncategorizedSeconds: 0, focusScore: 50, topDomains: null },
  },
]

for (const variant of VARIANTS) {
  test(`the popup shows the empty state for ${variant.name} (A11)`, async ({ extension }) => {
    const today = await workerToday(extension.worker)
    const value = typeof variant.value === 'object' ? { date: today, ...variant.value } : variant.value
    await seedStorage(extension.worker, { language: 'en', [`aggregates:${today}`]: value })

    const popup = await extension.context.newPage()
    const errors = collectErrors(popup)
    await popup.setViewportSize({ width: 360, height: 600 })
    await popup.goto(`chrome-extension://${extension.id}/src/popup/index.html`)

    await expect(popup.getByText('No browsing activity recorded yet')).toBeVisible()
    await expect(popup.getByText("Today's total", { exact: true }).locator('xpath=ancestor::div[1]')).toContainText('0s')
    const body = await popup.locator('body').innerText()
    expect(body).not.toContain('NaN')
    expect(body).not.toContain('2m')
    expect(errors).toEqual([])
  })
}
