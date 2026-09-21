import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SettingRow from '@/components/dashboard/SettingRow'
import SettingsTabs, { type SettingsTab } from './SettingsTabs'
import SettingsForm from './SettingsForm'
import RulesEditor, { type Rule } from './RulesEditor'
import ExportCloudDataButton from './ExportCloudDataButton'
import DeleteCloudDataButton from './DeleteCloudDataButton'
import SignOutButton from './SignOutButton'

interface UserPreference {
  email_report_enabled: boolean
  idle_timeout_minutes: number
  data_retention_days: number
  daily_goal_minutes: number
}

const TAB_KEYS = ['general', 'categories', 'privacy', 'account', 'about'] as const

function asTab(value: string | undefined): SettingsTab {
  return (TAB_KEYS as readonly string[]).includes(value ?? '') ? (value as SettingsTab) : 'general'
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const supabase = await createClient()
  const { t } = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Every panel's data in one parallel pass — switching tabs is then a pure
  // client-side flip, no navigation, no refetch.
  const [{ data: prefs, error: prefsError }, { data: ruleRows, error: rulesError }] = await Promise.all([
    supabase
      .from('user_preferences')
      .select('email_report_enabled, idle_timeout_minutes, data_retention_days, daily_goal_minutes')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('custom_rules')
      .select('id, pattern, match_type, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const fullName = user.user_metadata?.full_name as string | undefined
  const initial = user.email?.charAt(0).toUpperCase() ?? '?'

  const loadErrorBanner = (message: string) => (
    <p role="alert" className="max-w-xl rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
      {t.common.loadFailed}{message}
    </p>
  )

  const panels: Record<SettingsTab, React.ReactNode> = {
    general: prefsError ? (
      // Saving a form that silently fell back to defaults would push those
      // defaults to the cloud, and the extension pulls them from there.
      loadErrorBanner(prefsError.message)
    ) : (
      <div className="max-w-3xl">
        <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{t.settings.settingsIntro}</p>
        <dl className="mt-6">
          <SettingsForm userId={user.id} initialPrefs={prefs as UserPreference ?? null} />
        </dl>
      </div>
    ),

    categories: rulesError ? (
      loadErrorBanner(rulesError.message)
    ) : (
      <div className="max-w-3xl">
        <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{t.rules.intro}</p>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-slate-500">{t.rules.syncNote}</p>
        <RulesEditor userId={user.id} initialRules={(ruleRows ?? []) as Rule[]} />
      </div>
    ),

    privacy: (
      <div className="max-w-3xl">
        <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{t.settings.privacyIntro}</p>
        <dl className="mt-6">
          <SettingRow label={t.settings.exportData} description={t.settings.exportDesc}>
            <ExportCloudDataButton userId={user.id} />
          </SettingRow>
          <SettingRow label={t.settings.deleteAllCloud} description={t.settings.deleteCloudDesc}>
            <DeleteCloudDataButton userId={user.id} />
          </SettingRow>
        </dl>
        <p className="mt-6 max-w-[62ch] rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm leading-relaxed text-slate-500">
          {t.settings.localDataNote}
        </p>
        <Link href="/privacy" className="mt-5 inline-block text-sm text-brand transition-colors hover:text-brand-soft">
          {t.guide.linkPrivacy}
        </Link>
      </div>
    ),

    account: (
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-5">
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
            <p className="truncate text-sm text-slate-400">{user.email}</p>
            <p className="mt-1 text-xs text-slate-600">{t.settings.connectedViaGoogle}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    ),

    about: (
      <div className="max-w-3xl">
        <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{t.settings.aboutBlurb}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <span>EchoFocus {t.settings.appVersion}</span>
          <Link href="/privacy" className="transition-colors hover:text-slate-300">{t.common.privacyPolicy}</Link>
          <Link href="/terms" className="transition-colors hover:text-slate-300">{t.common.termsOfService}</Link>
          <a href="https://github.com/Hank1229/EchoFocus" target="_blank" rel="noreferrer" className="transition-colors hover:text-slate-300">
            GitHub
          </a>
          <a href="https://github.com/Hank1229/EchoFocus/issues" target="_blank" rel="noreferrer" className="transition-colors hover:text-slate-300">
            {t.settings.reportIssue}
          </a>
        </div>
      </div>
    ),
  }

  return (
    <>
      <DashboardHeader
        title={t.settings.settingsTitle}
        userEmail={user.email ?? undefined}
        avatarUrl={avatarUrl}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-6">
        <div className="rise rise-1">
          <SettingsTabs initialTab={asTab(tab)} panels={panels} />
        </div>
      </main>
    </>
  )
}
