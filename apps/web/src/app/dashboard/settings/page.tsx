import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SettingsForm from './SettingsForm'
import DeleteCloudDataButton from './DeleteCloudDataButton'
import ExportCloudDataButton from './ExportCloudDataButton'
import SignOutButton from './SignOutButton'
import { redirect } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import Link from 'next/link'

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

      <main className="flex-1 px-6 py-8 max-w-xl space-y-6">

        {/* Section 1: Account */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">{t.settings.account}</p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="rounded-full ring-1 ring-slate-700 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-green-400">{initial}</span>
                </div>
              )}
              <div>
                {fullName && (
                  <p className="text-sm font-semibold text-slate-100">{fullName}</p>
                )}
                <p className="text-sm text-slate-300">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400">
                  {t.settings.connectedViaGoogle}
                </span>
              </div>
            </div>
            <SignOutButton />
          </div>
        </section>

        {/* Section 2: Preferences */}
        <SettingsForm userId={user!.id} initialPrefs={prefs as UserPreference ?? null} />

        {/* Section 3: Data Management */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-6 space-y-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{t.settings.dataManagement}</p>

          <ExportCloudDataButton userId={user!.id} />

          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500 mb-3">{t.settings.deleteCloudDesc}</p>
            <DeleteCloudDataButton userId={user!.id} />
          </div>
        </section>

        {/* Section 4: About */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-6 space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{t.settings.about}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">EchoFocus</span>
            <span className="text-xs text-slate-500">{t.settings.version} {t.settings.appVersion}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              {t.common.privacyPolicy}
            </Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              {t.common.termsOfService}
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/issues"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              {t.settings.reportIssue}
            </a>
          </div>
        </section>

      </main>
    </>
  )
}
