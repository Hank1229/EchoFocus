import { chromium, expect, test as base, type BrowserContext, type Locator, type Page, type Worker } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

// Every screen is shot at this instant in this zone, on the date the
// dashboard fixtures use.
export const FIXED_TIME = Date.parse('2026-09-18T15:42:00+08:00')
export const TIMEZONE = 'Asia/Taipei'
export const TODAY = '2026-09-18'

export const THEMES = ['light', 'dark'] as const
export const LANGUAGES = ['en', 'zh-TW'] as const
export type Theme = (typeof THEMES)[number]
export type Language = (typeof LANGUAGES)[number]

export const EXTENSION_DIR = path.resolve(__dirname, '../../apps/extension/dist-vrt')

// The shape supabase-js stores under supabase_session. The build points at an
// unreachable Supabase URL, so this token is never sent anywhere that answers.
export const SESSION = JSON.stringify({
  access_token: 'vrt-access-token',
  refresh_token: 'vrt-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 4102444800,
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'demo@example.com',
    aud: 'authenticated',
    role: 'authenticated',
  },
})

const HOURS = [
  0, 0, 0, 0, 0, 0, 0, 420,
  2340, 3120, 2760, 1980, 540, 1260, 2880, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
]

export const TODAY_AGGREGATE = {
  date: TODAY,
  totalSeconds: 23760,
  productiveSeconds: 16200,
  distractionSeconds: 4980,
  neutralSeconds: 2580,
  uncategorizedSeconds: 0,
  focusScore: 76,
  topDomains: [
    { domain: 'github.com', seconds: 7920, category: 'productive' },
    { domain: 'docs.google.com', seconds: 4680, category: 'productive' },
    { domain: 'youtube.com', seconds: 3420, category: 'distraction' },
    { domain: 'stackoverflow.com', seconds: 2160, category: 'productive' },
    { domain: 'gmail.com', seconds: 1740, category: 'neutral' },
    { domain: 'reddit.com', seconds: 1560, category: 'distraction' },
  ],
  productiveByHour: HOURS,
}

export function shotName(...parts: string[]): string {
  return `${parts.join('-')}.png`
}

export interface Extension {
  context: BrowserContext
  worker: Worker
  id: string
}

// A fresh browser with the built extension loaded and the page clock frozen.
export async function launchExtension(): Promise<Extension> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    timezoneId: TIMEZONE,
    locale: 'en-US',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
  })
  await context.clock.setFixedTime(FIXED_TIME)
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
  const id = new URL(worker.url()).host
  // The worker opens onboarding on install; close it so only our own pages are open.
  const onboarding = context.pages().find(p => p.url().includes('onboarding'))
    ?? await context.waitForEvent('page', { timeout: 5000 }).catch(() => null)
  await onboarding?.close()
  // Headless Chrome has no user input to time, but keep the idle badge out of reach anyway.
  await worker.evaluate(() => chrome.idle.setDetectionInterval(4 * 60 * 60))
  return { context, worker, id }
}

// One browser per test worker, shared by its tests. Each test resets
// chrome.storage.local and seeds exactly what its screen needs.
export const test = base.extend<object, { extension: Extension }>({
  extension: [async ({}, use) => {
    const extension = await launchExtension()
    await use(extension)
    await extension.context.close()
  }, { scope: 'worker' }],
})

export { expect } from '@playwright/test'

// Playwright calls a page stable once two shots match under its lenient
// comparison, which accepted a chart that had not drawn yet. Wait instead for
// two byte-identical full-page shots, a beat apart.
async function settle(page: Page, options: Parameters<Page['screenshot']>[0]): Promise<void> {
  let previous = await page.screenshot(options)
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.waitForTimeout(400)
    const current = await page.screenshot(options)
    if (current.equals(previous)) return
    previous = current
  }
  throw new Error('The page never stopped changing: no two shots in a row matched.')
}

// A channel may drift this far (of 255) before the pixel counts as changed.
const CHANNEL_TOLERANCE = 8
// Up to this many changed pixels pass: across several full runs the renderer
// once flipped a single anti-aliased pixel. A 1px move of the smallest shape
// on screen (a 6px category dot) changes well over this many.
const MAX_CHANGED_PIXELS = 4

// toHaveScreenshot's pixelmatch skips pixels it reads as anti-aliasing, so a
// 1px move of a small round shape (a 6px category dot) passes it. The
// renderer in the pinned image is all but deterministic, so every screen is
// also compared strictly: more than MAX_CHANGED_PIXELS pixels past
// CHANNEL_TOLERANCE on any channel fails.
export async function expectScreen(page: Page, name: string, mask: Locator[] = []): Promise<void> {
  const options = { fullPage: true, mask, animations: 'disabled', caret: 'hide', scale: 'css' } as const
  await settle(page, options)
  await expect(page).toHaveScreenshot(name, options)

  const info = base.info()
  const baselinePath = info.snapshotPath(name)
  const actualBuffer = await page.screenshot(options)
  const updating = info.config.updateSnapshots === 'all' || info.config.updateSnapshots === 'changed'
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath))
  const actual = PNG.sync.read(actualBuffer)

  let changed = 0
  const diff = new PNG({ width: baseline.width, height: baseline.height })
  if (baseline.width === actual.width && baseline.height === actual.height) {
    for (let i = 0; i < baseline.data.length; i += 4) {
      const delta = Math.max(
        Math.abs(baseline.data[i] - actual.data[i]),
        Math.abs(baseline.data[i + 1] - actual.data[i + 1]),
        Math.abs(baseline.data[i + 2] - actual.data[i + 2]),
      )
      const hit = delta > CHANNEL_TOLERANCE
      if (hit) changed++
      diff.data[i] = hit ? 255 : baseline.data[i] / 4 + 191
      diff.data[i + 1] = hit ? 0 : baseline.data[i + 1] / 4 + 191
      diff.data[i + 2] = hit ? 0 : baseline.data[i + 2] / 4 + 191
      diff.data[i + 3] = 255
    }
  } else {
    changed = Infinity
  }
  if (changed <= MAX_CHANGED_PIXELS) return

  if (updating) {
    fs.writeFileSync(baselinePath, actualBuffer)
    return
  }
  const diffPath = info.outputPath(name.replace(/\.png$/, '-strict-diff.png'))
  fs.writeFileSync(diffPath, PNG.sync.write(diff))
  await info.attach('strict diff', { path: diffPath, contentType: 'image/png' })
  await info.attach('strict actual', { body: actualBuffer, contentType: 'image/png' })
  expect(changed, `${name}: ${changed} pixels changed by more than ${CHANNEL_TOLERANCE}/255`).toBeLessThanOrEqual(MAX_CHANGED_PIXELS)
}

export async function resetStorage(worker: Worker, items: Record<string, unknown>): Promise<void> {
  await worker.evaluate(async seed => {
    await chrome.storage.local.clear()
    await chrome.storage.local.set(seed)
  }, items)
}

// Opens an extension page and waits until it renders in the seeded language
// (the stored language is read after the first paint).
export async function openExtensionPage(
  extension: Extension,
  pathname: string,
  viewport: { width: number; height: number },
  theme: Theme,
  language: Language,
): Promise<Page> {
  const page = await extension.context.newPage()
  await page.setViewportSize(viewport)
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
  await page.goto(`chrome-extension://${extension.id}/${pathname}`)
  await page.waitForFunction(lang => document.documentElement.lang === lang, language)
  await page.evaluate(() => document.fonts.ready)
  return page
}
