import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SettingRow from './SettingRow'
import SettingsForm from './SettingsForm'
import DeleteCloudDataButton from './DeleteCloudDataButton'
import ExportCloudDataButton from './ExportCloudDataButton'
import SignOutButton from './SignOutButton'

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

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('email_report_enabled, idle_timeout_minutes, data_retention_days, daily_goal_minutes')
    .eq('user_id', user!.id)
    .maybeSingle()

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const fullName = user?.user_metadata?.full_name as string | undefined
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <>
      <DashboardHeader title={t.settings.profile} userEmail={user?.email ?? undefined} avatarUrl={avatarUrl} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        <div className="max-w-3xl">
          {/* Identity sits on the page ground, not in a card — it is who you are,
              not a setting you change. */}
          <div className="flex flex-wrap items-center gap-5 border-b border-slate-800/80 pb-8">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                width={52}
                height={52}
                className="flex-shrink-0 rounded-full ring-1 ring-slate-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full border border-slate-700 font-display text-xl font-semibold text-slate-400">
                {initial}
              </span>
            )}
            <div className="min-w-0 flex-1">
              {fullName && (
                <p className="font-display text-lg font-semibold tracking-tight text-slate-100">{fullName}</p>
              )}
              <p className="truncate text-sm text-slate-400">{user?.email}</p>
              <p className="mt-1 text-xs text-slate-600">{t.settings.connectedViaGoogle}</p>
            </div>
            <SignOutButton />
          </div>

          <dl>
            <SettingsForm userId={user!.id} initialPrefs={prefs as UserPreference ?? null} />

            <SettingRow label={t.settings.exportData} description={t.settings.exportDesc}>
              <ExportCloudDataButton userId={user!.id} />
            </SettingRow>

            <SettingRow label={t.settings.deleteAllCloud} description={t.settings.deleteCloudDesc}>
              <DeleteCloudDataButton userId={user!.id} />
            </SettingRow>
          </dl>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-xs text-slate-600">
            <span>EchoFocus {t.settings.appVersion}</span>
            <Link href="/privacy" className="transition-colors hover:text-slate-400">{t.common.privacyPolicy}</Link>
            <Link href="/terms" className="transition-colors hover:text-slate-400">{t.common.termsOfService}</Link>
            <a
              href="https://github.com/Hank1229/EchoFocus"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-slate-400"
            >
              GitHub
            </a>
            <a
              href="https://github.com/Hank1229/EchoFocus/issues"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-slate-400"
            >
              {t.settings.reportIssue}
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
