import { test } from '@playwright/test'
import { expectScreen, shotName, THEMES, LANGUAGES, FIXED_TIME, TIMEZONE } from './support'

// The /dev/preview pages render the real dashboard components on fixture
// data with no session; the dev server they need is started by the config.
const SETTINGS_TABS = ['general', 'categories', 'privacy', 'account', 'about']

const PAGES = [
  { name: 'today', path: '/dev/preview' },
  { name: 'trends', path: '/dev/preview/trends' },
  { name: 'guide', path: '/dev/preview/guide' },
  // The insight or review written in the other language than the page.
  { name: 'today-insight-mismatch', path: '/dev/preview?insight=other' },
  { name: 'trends-review-mismatch', path: '/dev/preview/trends?review=other' },
  ...SETTINGS_TABS.map(tab => ({ name: `settings-${tab}`, path: `/dev/preview/settings?tab=${tab}` })),
]

// The dev server compiles each page on its first request, which can take
// longer than a test under emulation; compile them all once up front.
test.beforeAll(async ({ request }) => {
  test.setTimeout(300_000)
  for (const { path } of PAGES) await request.get(path, { timeout: 120_000 })
})

test.use({
  viewport: { width: 1280, height: 800 },
  timezoneId: TIMEZONE,
  locale: 'en-US',
  reducedMotion: 'reduce',
  deviceScaleFactor: 1,
})

for (const theme of THEMES) {
  for (const language of LANGUAGES) {
    test.describe(`${theme} ${language}`, () => {
      test.use({ colorScheme: theme })

      for (const { name, path } of PAGES) {
        test(`dashboard ${name}`, async ({ page, context, baseURL }) => {
          await context.addCookies([
            { name: 'echofocus-theme', value: theme, url: baseURL! },
            { name: 'echofocus-lang', value: language, url: baseURL! },
          ])
          await page.clock.setFixedTime(FIXED_TIME)
          await page.goto(path, { waitUntil: 'networkidle' })
          await page.evaluate(() => document.fonts.ready)
          // Hydrated (React has attached to the server markup), and every
          // chart has measured its box and drawn.
          await page.waitForFunction(() => {
            const main = document.querySelector('main')
            const hydrated = !!main && Object.keys(main).some(key => key.startsWith('__reactFiber'))
            const charts = [...document.querySelectorAll('.recharts-responsive-container')]
            return hydrated && charts.every(chart => chart.querySelector('svg.recharts-surface'))
          })
          // The dev server's issue badge is tooling, not the product.
          await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
          // The sidebar is one screen tall; grow the window to the page so a
          // full-page shot shows it the way a tall enough window would.
          const height = await page.evaluate(() => document.documentElement.scrollHeight)
          await page.setViewportSize({ width: 1280, height: Math.max(800, height) })
          await expectScreen(page, shotName('dashboard', name, theme, language))
        })
      }
    })
  }
}
