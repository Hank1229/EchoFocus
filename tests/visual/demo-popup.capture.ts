import path from 'node:path'
import { test } from '@playwright/test'
import { launchExtension, resetStorage, openExtensionPage, SESSION, THEMES, LANGUAGES, type Extension } from './support'
import { PREVIEW_TODAY, TODAY_HOURS, TODAY_ROW, TODAY_SITES } from '../../apps/web/src/demo/fixtures'

// The idle popup on the demo day, one picture per theme and language, for the
// /demo Today page. The numbers are the fixture's, so the picture agrees with
// the page around it. Shot at 2x so it stays sharp on high-density screens.

const OUT = path.resolve(__dirname, '../../apps/web/public/demo')

// Evening of the demo day, after the last tracked hour and the 21:02 sync.
const EVENING = Date.parse(`${PREVIEW_TODAY}T21:30:00+08:00`)

const AGGREGATE = {
  date: PREVIEW_TODAY,
  totalSeconds: TODAY_ROW.productive + TODAY_ROW.distraction + TODAY_ROW.neutral,
  productiveSeconds: TODAY_ROW.productive,
  distractionSeconds: TODAY_ROW.distraction,
  neutralSeconds: TODAY_ROW.neutral,
  uncategorizedSeconds: 0,
  focusScore: TODAY_ROW.score,
  topDomains: TODAY_SITES,
  productiveByHour: TODAY_HOURS,
}

let extension: Extension
test.beforeAll(async () => { extension = await launchExtension(2) })
test.afterAll(async () => { await extension.context.close() })

for (const theme of THEMES) {
  for (const language of LANGUAGES) {
    test(`demo popup ${theme} ${language}`, async () => {
      await extension.context.clock.setFixedTime(EVENING)
      await resetStorage(extension.worker, {
        theme,
        language,
        [`aggregates:${PREVIEW_TODAY}`]: AGGREGATE,
        pomodoro_state: { phase: 'idle', endsAt: null, pausedRemainingMs: null },
        supabase_session: SESSION,
      })
      const page = await openExtensionPage(extension, 'src/popup/index.html', { width: 360, height: 600 }, theme, language)
      await page.getByText('github.com').waitFor()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${OUT}/popup-${theme}-${language}.png`, fullPage: true, animations: 'disabled', caret: 'hide' })
      await page.close()
    })
  }
}
