import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import en from '@/locales/en.json'
import { LanguageProvider } from '@/lib/i18n'
import { DemoProvider } from '@/lib/demo'
import SettingsContent from '@/app/dashboard/settings/SettingsContent'
import type { SettingsTab } from '@/app/dashboard/settings/SettingsTabs'
import TodayReview from '@/app/dashboard/today/TodayReview'
import WeeklyReview from '@/app/dashboard/trends/WeeklyReview'
import { DAILY_INSIGHT, PREVIEW_RULES, PREVIEW_TODAY, PREVIEW_USER, WEEKLY_REVIEW } from './fixtures'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo',
}))

// Rendered on the server, the way /demo's first paint is: every control that
// writes data or calls an API must already be disabled in that markup.

interface Button { label: string; disabled: boolean; title: string | null }

// Each button with its visible text, or its aria-label for the icon buttons.
function buttons(html: string): Button[] {
  return [...html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attrs, inner]) => ({
    label: inner.replace(/<[^>]+>/g, '').trim() || (attrs.match(/\saria-label="([^"]*)"/)?.[1] ?? ''),
    disabled: /\sdisabled=""/.test(attrs),
    title: attrs.match(/\stitle="([^"]*)"/)?.[1] ?? null,
  }))
}

function render(node: ReactNode, demo: boolean): string {
  const page = <LanguageProvider initialLanguage="en">{node}</LanguageProvider>
  return renderToStaticMarkup(demo ? <DemoProvider>{page}</DemoProvider> : page)
}

const settings = (tab: SettingsTab) => (
  <SettingsContent
    t={en}
    tab={tab}
    user={PREVIEW_USER}
    prefs={{
      email_report_enabled: false,
      idle_timeout_minutes: DEFAULT_SETTINGS.idleTimeoutMinutes,
      data_retention_days: DEFAULT_SETTINGS.dataRetentionDays,
      daily_goal_minutes: DEFAULT_SETTINGS.dailyGoalMinutes,
      pomodoro_focus_minutes: 25,
      pomodoro_break_minutes: 5,
      pomodoro_reminders_enabled: true,
    }}
    prefsError={null}
    ruleRows={PREVIEW_RULES}
    rulesError={null}
  />
)

const today = (analysisText: string | null) => (
  <TodayReview
    totalSeconds={31020}
    focusScore={76}
    productiveSeconds={22680}
    distractionSeconds={5940}
    neutralSeconds={2400}
    uncategorizedSeconds={0}
    streak={{ current: 1, best: 1 }}
    analysisText={analysisText}
    date={PREVIEW_TODAY}
    canGenerate
    language="en"
  />
)

// Every control the demo locks, by the screen it is on and its visible label
// (or aria-label for the icon buttons).
const LOCKED: Array<{ name: string; node: ReactNode; labels: string[] }> = [
  { name: 'settings general', node: settings('general'), labels: [en.common.saveSettings] },
  {
    name: 'settings categories',
    node: settings('categories'),
    labels: [en.rules.add, ...PREVIEW_RULES.flatMap(r => [en.rules.editAria, en.rules.deleteAria].map(l => l.replace('{pattern}', r.pattern)))],
  },
  { name: 'settings privacy', node: settings('privacy'), labels: [en.settings.exportAction, en.settings.deleteAction] },
  { name: 'settings account', node: settings('account'), labels: [en.settings.signOut] },
  { name: 'today with an insight', node: today(DAILY_INSIGHT.en), labels: [en.today.regenerate] },
  { name: 'today with no insight', node: today(null), labels: [en.today.generateInsight] },
  { name: 'today with an insight in the other language', node: today(DAILY_INSIGHT['zh-TW']), labels: [en.aiInsights.regenerateIn.replace('{lang}', en.aiInsights.langEnglish)] },
  { name: 'weekly review', node: <WeeklyReview initialText={WEEKLY_REVIEW.en} language="en" />, labels: [en.today.regenerate] },
  { name: 'weekly review, none yet', node: <WeeklyReview initialText={null} language="en" />, labels: [en.aiInsights.generateWeekly] },
]

function find(html: string, label: string): Button {
  const button = buttons(html).find(b => b.label === label)
  expect(button, `button "${label}"`).toBeDefined()
  return button!
}

describe('demo mode is read-only', () => {
  const fetchSpy = vi.fn()
  beforeEach(() => { vi.stubGlobal('fetch', fetchSpy) })
  afterEach(() => { vi.unstubAllGlobals(); fetchSpy.mockReset() })

  for (const { name, node, labels } of LOCKED) {
    it(`${name}: every write control is disabled and says why`, () => {
      const html = render(node, true)
      for (const label of labels) {
        const button = find(html, label)
        expect(button.disabled, label).toBe(true)
        expect(button.title, label).toBe(en.demo.readOnlyTitle)
      }
    })

    it(`${name}: the same controls work outside the demo`, () => {
      const html = render(node, false)
      for (const label of labels) {
        const button = find(html, label)
        expect(button.disabled, label).toBe(false)
        expect(button.title, label).toBeNull()
      }
    })
  }

  it('says "Demo mode" beside the locked settings controls', () => {
    for (const tab of ['general', 'categories', 'privacy', 'account'] as const) {
      expect(render(settings(tab), true)).toContain(en.demo.readOnly)
      expect(render(settings(tab), false)).not.toContain(en.demo.readOnly)
    }
  })

  it('leaves out the extension link card', () => {
    const html = render(settings('account'), true)
    expect(html).not.toContain(en.extensionLink.statusLabel)
    expect(render(settings('account'), false)).toContain(en.extensionLink.statusLabel)
  })

  it('renders every screen without a single fetch', () => {
    for (const { node } of LOCKED) render(node, true)
    render(settings('about'), true)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
