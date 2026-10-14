import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { test, expect, collectErrors, seedStorage, storage } from './support'

// The dashboard's extension card against the real dist-vrt extension, on
// /dev/preview/link (the real dashboard pages need a Supabase session, which
// this suite never has). Supabase is unreachable here, so a CONNECT can only
// fail; the successful link is covered by the manual checklist.

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const EMAIL = 'me@example.com'

function storedSession(userId: string): string {
  return JSON.stringify({
    access_token: 'e2e-access',
    refresh_token: 'e2e-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, email: EMAIL },
  })
}

async function openPreview(context: BrowserContext | Browser, baseURL: string, userId: string, data = false): Promise<{ page: Page; errors: string[] }> {
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${baseURL}/dev/preview/link?user=${userId}&email=${encodeURIComponent(EMAIL)}&data=${data ? 1 : 0}`)
  return { page, errors }
}

const today = (page: Page) => page.getByTestId('live-today')
const settings = (page: Page) => page.getByTestId('live-settings')

test('a signed-out extension offers the link on both cards', async ({ extension, baseURL }) => {
  const { page, errors } = await openPreview(extension.context, baseURL!, A)
  await expect(settings(page)).toContainText('Not signed in')
  await expect(today(page)).toContainText('The extension in this browser is not signed in')
  await expect(today(page).getByRole('button', { name: `Link the extension (${EMAIL})` })).toBeVisible()
  expect(errors).toEqual([])
})

test('signed in: the same account hides the Today card, another account explains itself', async ({ extension, baseURL }) => {
  await seedStorage(extension.worker, { supabase_session: storedSession(A) })

  const same = await openPreview(extension.context, baseURL!, A)
  await expect(settings(same.page)).toContainText('Signed in to this account')
  await expect(today(same.page).locator('[data-link-status]')).toHaveCount(0)
  expect(same.errors).toEqual([])

  const other = await openPreview(extension.context, baseURL!, B)
  await expect(settings(other.page)).toContainText('Signed in to another account')
  await expect(today(other.page)).toContainText('signed in to another account, so its data goes there')
  await expect(today(other.page).getByRole('button')).toHaveCount(0)
  await expect(settings(other.page).getByRole('button')).toHaveCount(0)
  expect(other.errors).toEqual([])
})

test('a device linked to another account refuses, and no session appears', async ({ extension, baseURL }) => {
  await seedStorage(extension.worker, { linked_user: B })
  const { page, errors } = await openPreview(extension.context, baseURL!, A)

  await today(page).getByRole('button', { name: `Link the extension (${EMAIL})` }).click()
  await expect(today(page)).toContainText('was linked to another account before')

  const stored = await storage(extension.worker, ['supabase_session', 'signin_in_progress', 'linked_user'])
  expect(stored).toEqual({ linked_user: B })
  expect(errors).toEqual([])
})

test('a link whose Google sign-in fails says so and leaves nothing behind', async ({ extension, baseURL }) => {
  const { page, errors } = await openPreview(extension.context, baseURL!, A)

  await today(page).getByRole('button', { name: `Link the extension (${EMAIL})` }).click()
  await expect(today(page).getByRole('alert')).toContainText('Linking did not finish')

  const stored = await storage(extension.worker, ['supabase_session', 'signin_in_progress', 'linked_user'])
  expect(stored).toEqual({})
  expect(errors).toEqual([])
})

test('a page outside the dashboard origins cannot reach the extension', async ({ extension }) => {
  for (const url of ['https://not-the-dashboard.test/', 'http://localhost:4999/']) {
    const page = await extension.context.newPage()
    const errors = collectErrors(page)
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<title>other</title><p>other</p>' }))
    await page.goto(url)
    const reachable = await page.evaluate(() => typeof (window as { chrome?: { runtime?: { sendMessage?: unknown } } }).chrome?.runtime?.sendMessage)
    expect(reachable, url).toBe('undefined')
    expect(errors).toEqual([])
  }
})

test('without the extension the cards say it was not found', async ({ baseURL }) => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true })
  try {
    const { page, errors } = await openPreview(browser, baseURL!, A)
    await expect(settings(page)).toContainText('Not found in this browser')
    await expect(today(page)).toContainText('The EchoFocus extension was not found in this browser')

    // An account that already has synced days does not need telling again.
    const withData = await openPreview(browser, baseURL!, A, true)
    await expect(settings(withData.page)).toContainText('Not found in this browser')
    await expect(today(withData.page).locator('[data-link-status]')).toHaveCount(0)
    expect([...errors, ...withData.errors]).toEqual([])
  } finally {
    await browser.close()
  }
})
