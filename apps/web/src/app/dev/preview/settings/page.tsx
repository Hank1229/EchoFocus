import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import SettingsContent, { asTab } from '../../../dashboard/settings/SettingsContent'

// Design-review harness for the whole Settings page, every tab, on fixture
// data (?tab= picks the panel). Saving against the fixture user id fails RLS
// by design: this page is for looking, not using. Dev only, production 404s.

const USER = { id: '00000000-0000-4000-8000-000000000000', email: 'preview@echofocus.dev', fullName: 'Preview User' }

export default async function SettingsPreviewPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { tab } = await searchParams
  const { t } = await getLocale()

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader title={t.settings.settingsTitle} userEmail={USER.email} />
        <SettingsContent
          t={t}
          tab={asTab(tab)}
          user={USER}
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
          ruleRows={[
            { id: 'rule-1', pattern: 'youtube.com/playlist', match_type: 'path', category: 'productive' },
            { id: 'rule-2', pattern: '*.notion.site', match_type: 'wildcard', category: 'productive' },
            { id: 'rule-3', pattern: 'news.ycombinator.com', match_type: 'exact', category: 'distraction' },
          ]}
          rulesError={null}
        />
      </div>
    </div>
  )
}
