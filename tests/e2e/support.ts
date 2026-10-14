import { chromium, expect, test as base, type BrowserContext, type Page, type Worker } from '@playwright/test'
import path from 'node:path'

// The extension is loaded the way tests/visual/support.ts loads it (the
// dist-vrt build, --load-extension), but on the real clock and in the
// machine's own timezone: the service worker's clock is not covered by
// Playwright's timezone emulation at install time, so "today" is always asked
// of the worker itself (workerToday) and never computed in Node.
const EXTENSION_DIR = path.resolve(__dirname, '../../apps/extension/dist-vrt')

export interface Extension {
  context: BrowserContext
  worker: Worker
  id: string
}

export async function launchExtension(): Promise<Extension> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    locale: 'en-US',
    deviceScaleFactor: 1,
    acceptDownloads: true,
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  })
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
  const id = new URL(worker.url()).host
  // The worker opens onboarding on install; close it so only the test's pages are open.
  const onboarding = context.pages().find(p => p.url().includes('onboarding'))
    ?? await context.waitForEvent('page', { timeout: 5000 }).catch(() => null)
  await onboarding?.close()
  // Headless Chrome has no user input to time; keep the idle state out of reach.
  await worker.evaluate(() => chrome.idle.setDetectionInterval(4 * 60 * 60))
  return { context, worker, id }
}

// One fresh browser per test, closed afterwards.
export const test = base.extend<{ extension: Extension }>({
  extension: async ({}, use) => {
    const extension = await launchExtension()
    await use(extension)
    await extension.context.close()
  },
})

export { expect }

export async function openExtensionPage(
  extension: Extension,
  pathname: string,
  viewport = { width: 360, height: 600 },
): Promise<Page> {
  const page = await extension.context.newPage()
  await page.setViewportSize(viewport)
  await page.goto(`chrome-extension://${extension.id}/${pathname}`)
  return page
}

export function storage(worker: Worker, keys: string | string[] | null = null): Promise<Record<string, unknown>> {
  return worker.evaluate(k => chrome.storage.local.get(k), keys)
}

export async function seedStorage(worker: Worker, items: Record<string, unknown>): Promise<void> {
  await worker.evaluate(async seed => {
    await chrome.storage.local.clear()
    await chrome.storage.local.set(seed)
  }, items)
}

// Today's YYYY-MM-DD as the extension itself computes it (local time in the
// worker), which is the key it writes entries and aggregates under.
export function workerToday(worker: Worker): Promise<string> {
  return worker.evaluate(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
}

// A fake site: the tracker reads only tab.url, so a fulfilled route stands in
// for the real host and no network is touched.
export async function openSite(extension: Extension, url: string): Promise<Page> {
  const title = new URL(url).hostname
  const page = await extension.context.newPage()
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: `<title>${title}</title><h1>${title}</h1>` }))
  await page.goto(url)
  await page.bringToFront()
  return page
}

export interface TrackingState {
  activeDomain: string | null
  activeUrl: string | null
  activeCategory: string | null
}

export async function trackingState(worker: Worker): Promise<TrackingState | undefined> {
  const { tracking_state } = await storage(worker, 'tracking_state')
  return tracking_state as TrackingState | undefined
}

// Waits until the worker has opened a session on `url` and returns its state.
export async function waitForSession(worker: Worker, url: string): Promise<TrackingState> {
  let state: TrackingState | undefined
  await expect.poll(async () => {
    state = await trackingState(worker)
    return state?.activeUrl
  }).toBe(url)
  return state!
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface StoredEntry {
  domain: string
  category: string
  duration: number
}

export async function entriesFor(worker: Worker, date: string): Promise<StoredEntry[]> {
  const stored = await storage(worker, `entries:${date}`)
  return ((stored[`entries:${date}`] as StoredEntry[] | undefined) ?? [])
}

// Console errors and uncaught exceptions on a page, collected from creation.
export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(String(error)))
  return errors
}
