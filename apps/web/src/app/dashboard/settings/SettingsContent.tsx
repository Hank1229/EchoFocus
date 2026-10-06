import Link from 'next/link'
import type { Locale } from '@/lib/i18n-server'
import SettingRow from '@/components/dashboard/SettingRow'
import SettingsTabs, { type SettingsTab } from './SettingsTabs'
import SettingsForm from './SettingsForm'
import RulesEditor, { type Rule } from './RulesEditor'
import ExportCloudDataButton from './ExportCloudDataButton'
import DeleteCloudDataButton from './DeleteCloudDataButton'
import SignOutButton from './SignOutButton'

export interface UserPreference {
  email_report_enabled: boolean
  idle_timeout_minutes: number
  data_retention_days: number
  daily_goal_minutes: number
  pomodoro_focus_minutes: number
  pomodoro_break_minutes: number
  pomodoro_reminders_enabled: boolean
}

const TAB_KEYS = ['general', 'categories', 'privacy', 'account', 'about'] as const

export function asTab(value: string | undefined): SettingsTab {
  return (TAB_KEYS as readonly string[]).includes(value ?? '') ? (value as SettingsTab) : 'general'
}

interface Props {
  t: Locale
  tab: SettingsTab
  user: { id: string; email?: string; fullName?: string; avatarUrl?: string }
  prefs: UserPreference | null
  prefsError: { message: string } | null
  ruleRows: Rule[] | null
  rulesError: { message: string } | null
}

// The body of Dashboard Settings, below the header: the five panels and the
// footer note. The page passes the signed-in user's data; /dev/preview/settings
// passes fixtures, so the visual tests shoot the same markup users see.
export default function SettingsContent({ t, tab, user, prefs, prefsError, ruleRows, rulesError }: Props) {
  const { avatarUrl, fullName } = user
  const initial = user.email?.charAt(0).toUpperCase() ?? '?'

  const loadErrorBanner = (message: string) => (
    <p role="alert" className="max-w-xl text-body" style={{ color: 'var(--danger)' }}>
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
        <p className="max-w-[62ch] text-body text-content-secondary">{t.settings.settingsIntro}</p>
        <dl className="mt-6">
          <SettingsForm userId={user.id} initialPrefs={prefs} />
        </dl>
      </div>
    ),

    categories: rulesError ? (
      loadErrorBanner(rulesError.message)
    ) : (
      <div className="max-w-3xl">
        <p className="max-w-[62ch] text-body text-content-secondary">{t.rules.intro}</p>
        <p className="mt-2 max-w-[62ch] text-caption text-content-tertiary">{t.rules.syncNote}</p>
        <RulesEditor userId={user.id} initialRules={ruleRows ?? []} />
      </div>
    ),

    privacy: (
      <div className="max-w-3xl">
        <p className="max-w-[62ch] text-body text-content-secondary">{t.settings.privacyIntro}</p>
        <dl className="mt-6">
          <SettingRow label={t.settings.exportData} description={t.settings.exportDesc}>
            <ExportCloudDataButton userId={user.id} />
          </SettingRow>
          <SettingRow label={t.settings.deleteAllCloud} description={t.settings.deleteCloudDesc}>
            <DeleteCloudDataButton userId={user.id} />
          </SettingRow>
        </dl>
        <p className="mt-6 max-w-[62ch] rounded-lg border border-line bg-surface px-4 py-3 text-caption leading-relaxed text-content-secondary">
          {t.settings.localDataNote}
        </p>
        <Link href="/privacy" className="pressable mt-5 inline-block text-label text-accent">
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
              className="flex-shrink-0 rounded-full ring-1 ring-line-strong"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full border border-line-strong text-title text-content-secondary">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {fullName && (
              <p className="text-body font-semibold text-content">{fullName}</p>
            )}
            <p className="truncate text-body text-content-secondary">{user.email}</p>
            <p className="mt-1 text-caption text-content-tertiary">{t.settings.connectedViaGoogle}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    ),

    about: (
      <div className="max-w-3xl">
        <p className="max-w-[62ch] text-body text-content-secondary">{t.settings.aboutBlurb}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-body text-content-secondary">
          <span>EchoFocus {t.settings.appVersion}</span>
          <Link href="/privacy" className="pressable hover:text-content">{t.common.privacyPolicy}</Link>
          <Link href="/terms" className="pressable hover:text-content">{t.common.termsOfService}</Link>
          <a href="https://github.com/Hank1229/EchoFocus" target="_blank" rel="noreferrer" className="pressable hover:text-content">
            GitHub
          </a>
          <a href="https://github.com/Hank1229/EchoFocus/issues" target="_blank" rel="noreferrer" className="pressable hover:text-content">
            {t.settings.reportIssue}
          </a>
        </div>
      </div>
    ),
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-6">
      <div className="mx-auto w-full max-w-3xl">
        <SettingsTabs initialTab={tab} panels={panels} />
        <p className="mt-10 border-t border-line pt-5 text-caption text-content-tertiary">
          {t.settings.extensionOnlyNote}
        </p>
      </div>
    </main>
  )
}
