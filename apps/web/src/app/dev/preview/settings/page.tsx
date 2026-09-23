import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SettingsForm from '../../../dashboard/settings/SettingsForm'

// Design-review harness for the settings General panel. Saving against the
// fixture user id fails RLS by design — this page is for looking, not using.
// Dev only — production 404s.

export default async function SettingsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const { t } = await getLocale()

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader title={t.settings.settingsTitle} userEmail="preview@echofocus.dev" />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
          <div className="max-w-3xl">
            <p className="max-w-[62ch] text-body text-content-secondary">{t.settings.settingsIntro}</p>
            <dl className="mt-6">
              <SettingsForm
                userId="00000000-0000-4000-8000-000000000000"
                initialPrefs={{
                  email_report_enabled: false,
                  idle_timeout_minutes: 2,
                  data_retention_days: 90,
                  daily_goal_minutes: 360,
                  pomodoro_focus_minutes: 25,
                  pomodoro_break_minutes: 5,
                  pomodoro_reminders_enabled: true,
                }}
              />
            </dl>
          </div>
        </main>
      </div>
    </div>
  )
}
