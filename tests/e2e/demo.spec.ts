import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { collectErrors } from './support'

// The public /demo in a plain browser with no extension, against the e2e web
// server, whose Supabase URL (127.0.0.1:9) answers nothing. Any request to it,
// or to a real Supabase project, means the demo reached for a backend.

const SUPABASE = /^https?:\/\/(127\.0\.0\.1:9\/|[^/]*supabase\.co\/)/

const PAGES = [
  '/demo',
  '/demo/trends',
  '/demo/guide',
  ...['general', 'categories', 'privacy', 'account', 'about'].map(tab => `/demo/settings?tab=${tab}`),
]

// Every control the demo must hold disabled, by page and accessible name.
const LOCKED: Record<string, string[]> = {
  '/demo': ['Regenerate'],
  '/demo/trends': ['Regenerate'],
  '/demo/settings?tab=general': ['Save settings'],
  '/demo/settings?tab=categories': ['Add rule', 'Edit the rule for youtube.com/playlist', 'Delete the rule for youtube.com/playlist', 'Edit the rule for *.notion.site', 'Delete the rule for *.notion.site'],
  '/demo/settings?tab=privacy': ['Download JSON', 'Delete'],
  '/demo/settings?tab=account': ['Sign out'],
}

// The cookie @supabase/ssr reads for this server's Supabase URL, holding a
// session that has not expired: a visitor who is signed in to the dashboard.
async function signInVisitor(context: BrowserContext, baseURL: string): Promise<void> {
  const session = {
    access_token: 'e2e-access',
    refresh_token: 'e2e-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '33333333-3333-4333-8333-333333333333', aud: 'authenticated', role: 'authenticated', email: 'visitor@example.com' },
  }
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
  await context.addCookies([{ name: 'sb-127-auth-token', value, url: baseURL }])
}

function watchSupabase(page: Page): string[] {
  const hits: string[] = []
  page.on('request', request => { if (SUPABASE.test(request.url())) hits.push(request.url()) })
  return hits
}

async function open(page: Page, path: string): Promise<void> {
  const response = await page.goto(path, { waitUntil: 'networkidle' })
  expect(response?.status(), path).toBe(200)
  expect(new URL(page.url()).pathname, `${path} stayed put`).toBe(new URL(path, 'http://x').pathname)
  await expect(page.getByRole('note')).toContainText('This is sample data.')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
}

test('every demo page opens signed out, with no console error and no Supabase request', async ({ page }) => {
  const errors = collectErrors(page)
  const hits = watchSupabase(page)
  for (const path of PAGES) await open(page, path)
  expect(errors).toEqual([])
  expect(hits).toEqual([])
})

test('every write control is disabled', async ({ page }) => {
  for (const [path, names] of Object.entries(LOCKED)) {
    await open(page, path)
    for (const name of names) {
      await expect(page.getByRole('button', { name, exact: true }), `${path}: ${name}`).toBeDisabled()
    }
  }
  await open(page, '/demo')
  await expect(page.getByText('Demo mode: sign in to generate a real analysis.')).toBeVisible()
  await expect(page.locator('[data-link-status]')).toHaveCount(0)
})

test('every link stays in the demo or goes to a public page', async ({ page }) => {
  const hrefs = new Set<string>()
  const collect = async () => {
    for (const href of await page.locator('a[href]').evaluateAll(links => links.map(a => a.getAttribute('href') ?? ''))) hrefs.add(href)
  }
  for (const path of PAGES) {
    await open(page, path)
    await collect()
  }
  // The Guide's later steps render their links only once reached; the last
  // of its six steps swaps Next for an "Open settings" link.
  await open(page, '/demo/guide')
  for (let step = 1; step < 6; step++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText(`Step ${step + 1} of 6`)).toBeVisible()
    await collect()
  }
  await expect(page.getByRole('link', { name: 'Open settings' })).toHaveAttribute('href', '/demo/settings')
  const internal = [...hrefs].filter(href => href.startsWith('/'))
  expect(internal.filter(href => !/^\/(demo([/?#]|$)|privacy$|terms$|$)/.test(href))).toEqual([])
  expect(internal).toEqual(expect.arrayContaining(['/demo', '/demo/trends', '/demo/guide', '/demo/settings', '/']))
})

test('a visitor signed in to the dashboard still reaches no backend from the demo', async ({ context, page, baseURL }) => {
  await signInVisitor(context, baseURL!)
  const hits = watchSupabase(page)

  // Control: outside the demo the same cookie makes the page ask Supabase
  // who is signed in (the theme sync), so the cookie is the real thing.
  await page.goto('/', { waitUntil: 'networkidle' })
  expect(hits.length, 'the landing page asks Supabase about the session').toBeGreaterThan(0)
  hits.length = 0

  const errors = collectErrors(page)
  for (const path of PAGES) await open(page, path)
  // Switching the theme on the demo must not write the visitor's cloud row.
  await open(page, '/demo/settings?tab=general')
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await page.waitForLoadState('networkidle')
  expect(hits).toEqual([])
  expect(errors).toEqual([])
})
