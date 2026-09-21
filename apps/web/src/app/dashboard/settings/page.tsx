import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SettingsForm from './SettingsForm'

interface UserPreference {
  email_report_enabled: boolean
  idle_timeout_minutes: number
  data_retention_days: number
  daily_goal_minutes: number
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { t } = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prefs, error: loadError } = await supabase
    .from('user_preferences')
    .select('email_report_enabled, idle_timeout_minutes, data_retention_days, daily_goal_minutes')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <>
      <DashboardHeader
        title={t.settings.settingsTitle}
        userEmail={user.email ?? undefined}
        avatarUrl={user.user_metadata?.avatar_url as string | undefined}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        <div className="rise rise-1 max-w-3xl">
          <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{t.settings.settingsIntro}</p>

          {/* Saving a form that silently fell back to defaults would push those
              defaults to the cloud, and the extension pulls them from there. */}
          {loadError ? (
            <p role="alert" className="mt-8 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
              {t.common.loadFailed}{loadError.message}
            </p>
          ) : (
            <>
              <dl className="mt-8">
                <SettingsForm userId={user.id} initialPrefs={prefs as UserPreference ?? null} />
              </dl>

              <Link
                href="/dashboard/profile"
                className="mt-6 inline-block text-sm text-brand transition-colors hover:text-brand-soft"
              >
                {t.settings.linkProfile}
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  )
}
