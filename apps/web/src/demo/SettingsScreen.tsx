import { DEFAULT_SETTINGS } from '@echofocus/shared'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SettingsContent, { asTab } from '../app/dashboard/settings/SettingsContent'
import { PREVIEW_RULES, PREVIEW_USER } from './fixtures'

// The whole Settings page, every tab, on fixture data, for /demo and
// /dev/preview (`tab` picks the panel).
export default async function SettingsScreen({ tab }: { tab?: string }) {
  const { t } = await getLocale()

  return (
    <>
      <DashboardHeader title={t.settings.settingsTitle} userEmail={PREVIEW_USER.email} />
      <SettingsContent
        t={t}
        tab={asTab(tab)}
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
    </>
  )
}
