import {
  test, expectScreen, resetStorage, openExtensionPage, launchExtension, shotName,
  THEMES, LANGUAGES, FIXED_TIME, SESSION, TODAY, TODAY_AGGREGATE,
} from './support'

const POPUP = { width: 360, height: 600 }
const OPTIONS = { width: 900, height: 800 }
const ONBOARDING = { width: 1100, height: 860 }

const SIGNED_IN = {
  supabase_session: SESSION,
  last_sync_at: '2026-09-18T07:00:00.000Z',
  history_backfill_result: { days: 12, at: '2026-09-11T02:30:00.000Z' },
}

// Countdowns are derived from endsAt against the frozen clock, so these read
// 18:24, 03:10 and 12:05 on every run.
const POMODORO = {
  idle: { phase: 'idle', endsAt: null, pausedRemainingMs: null },
  focusing: { phase: 'focusing', endsAt: FIXED_TIME + (18 * 60 + 24) * 1000, pausedRemainingMs: null },
  break: { phase: 'break', endsAt: FIXED_TIME + (3 * 60 + 10) * 1000, pausedRemainingMs: null },
  paused: { phase: 'focusing', endsAt: FIXED_TIME + (12 * 60 + 5) * 1000, pausedRemainingMs: (12 * 60 + 5) * 1000 },
}

const POPUP_STATES = [
  { name: 'idle', signedIn: true, pomodoro: POMODORO.idle },
  { name: 'focusing', signedIn: true, pomodoro: POMODORO.focusing },
  { name: 'break', signedIn: true, pomodoro: POMODORO.break },
  { name: 'paused', signedIn: true, pomodoro: POMODORO.paused },
  { name: 'signed-out', signedIn: false, pomodoro: POMODORO.idle },
] as const

const OPTIONS_TABS = ['general', 'categories', 'privacy', 'account', 'about'] as const

// The live session the "Now" row shows started this long before FIXED_TIME,
// so the row reads 12:34 and the totals include it.
const SESSION_SECONDS = 12 * 60 + 34

for (const theme of THEMES) {
  for (const language of LANGUAGES) {
    test.describe(`${theme} ${language}`, () => {
      for (const state of POPUP_STATES) {
        test(`popup ${state.name}`, async ({ extension }) => {
          await resetStorage(extension.worker, {
            theme,
            language,
            [`aggregates:${TODAY}`]: TODAY_AGGREGATE,
            pomodoro_state: state.pomodoro,
            ...(state.signedIn ? SIGNED_IN : {}),
          })
          const page = await openExtensionPage(extension, 'src/popup/index.html', POPUP, theme, language)
          await page.getByText('github.com').waitFor()
          // Favicons come from Chrome's cache, which differs per profile.
          await expectScreen(page, shotName('popup', state.name, theme, language), [page.locator('img.favicon')])
          await page.close()
        })
      }

      // The "Now" row needs a real tab on a tracked site, and its seconds come
      // from the worker's clock, which the page clock does not reach. So this
      // shot gets its own browser: the worker's Date.now is pinned to the
      // session start while the site opens, then to FIXED_TIME.
      test('popup current-site', async () => {
        // Its own browser launch on top of the shot; slow when the dashboard
        // pages are compiling alongside.
        test.setTimeout(150_000)
        const extension = await launchExtension()
        try {
          await resetStorage(extension.worker, {
            theme,
            language,
            [`aggregates:${TODAY}`]: TODAY_AGGREGATE,
            pomodoro_state: POMODORO.idle,
            ...SIGNED_IN,
          })
          // The heartbeat would read the clock jump as the machine sleeping
          // and close the session.
          await extension.worker.evaluate(async start => {
            await chrome.alarms.clear('echofocus-heartbeat')
            Date.now = () => start
          }, FIXED_TIME - SESSION_SECONDS * 1000)
          const popup = await openExtensionPage(extension, 'src/popup/index.html', POPUP, theme, language)
          await popup.getByText('github.com').waitFor()
          const site = await extension.context.newPage()
          await site.route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>GitHub</title>' }))
          await site.goto('https://github.com/')
          await extension.worker.evaluate(now => { Date.now = () => now }, FIXED_TIME)
          await popup.getByText('12:34').waitFor()
          await expectScreen(popup, shotName('popup', 'current-site', theme, language), [popup.locator('img.favicon')])
        } finally {
          await extension.context.close()
        }
      })

      for (const signedIn of [true, false]) {
        for (const tab of OPTIONS_TABS) {
          const account = signedIn ? 'signed-in' : 'signed-out'
          test(`options ${tab} ${account}`, async ({ extension }) => {
            await resetStorage(extension.worker, {
              theme,
              language,
              [`aggregates:${TODAY}`]: TODAY_AGGREGATE,
              ...(signedIn ? SIGNED_IN : {}),
            })
            const page = await openExtensionPage(extension, `src/options/index.html#${tab}`, OPTIONS, theme, language)
            await page.locator('section').first().waitFor()
            // Storage use counts whatever the worker has written by now.
            const mask = tab === 'privacy' ? [page.getByText(/\d+\.\d{2} MB/), page.locator('.bg-accent.h-2')] : []
            await expectScreen(page, shotName('options', tab, account, theme, language), mask)
            await page.close()
          })
        }
      }

      for (const step of [0, 1, 2, 3]) {
        test(`onboarding step ${step}`, async ({ extension }) => {
          await resetStorage(extension.worker, { theme, language })
          const page = await openExtensionPage(extension, 'src/onboarding/index.html', ONBOARDING, theme, language)
          for (let i = 0; i < step; i++) await page.locator('footer button').last().click()
          await page.locator('main h1').waitFor()
          await expectScreen(page, shotName('onboarding', `step${step}`, theme, language))
          await page.close()
        })
      }

      // The last step's sign-in outcomes, driven through storage the way the
      // worker reports them; the real Google flow never runs.
      const SIGN_IN_STATES = [
        { name: 'connecting', write: { signin_in_progress: FIXED_TIME - 10_000 }, remove: [] as string[] },
        { name: 'incomplete', write: { signin_in_progress: FIXED_TIME - 10_000 }, remove: ['signin_in_progress'] },
        { name: 'done', write: { supabase_session: SESSION }, remove: [] as string[] },
      ]
      for (const state of SIGN_IN_STATES) {
        test(`onboarding step 3 ${state.name}`, async ({ extension }) => {
          await resetStorage(extension.worker, { theme, language })
          const page = await openExtensionPage(extension, 'src/onboarding/index.html', ONBOARDING, theme, language)
          for (let i = 0; i < 3; i++) await page.locator('footer button').last().click()
          await page.locator('main h1').waitFor()
          await extension.worker.evaluate(items => chrome.storage.local.set(items), state.write)
          if (state.remove.length > 0) await extension.worker.evaluate(keys => chrome.storage.local.remove(keys), state.remove)
          await expectScreen(page, shotName('onboarding', `step3-${state.name}`, theme, language))
          await page.close()
        })
      }
    })
  }
}
