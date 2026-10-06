import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import type { Rule } from './RulesEditor'
import SettingsContent, { asTab, type UserPreference } from './SettingsContent'

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
      .select('email_report_enabled, idle_timeout_minutes, data_retention_days, daily_goal_minutes, pomodoro_focus_minutes, pomodoro_break_minutes, pomodoro_reminders_enabled')
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

  return (
    <>
      <DashboardHeader
        title={t.settings.settingsTitle}
        userEmail={user.email ?? undefined}
        avatarUrl={avatarUrl}
      />
      <SettingsContent
        t={t}
        tab={asTab(tab)}
        user={{ id: user.id, email: user.email ?? undefined, fullName, avatarUrl }}
        prefs={(prefs as UserPreference | null) ?? null}
        prefsError={prefsError}
        ruleRows={(ruleRows ?? null) as Rule[] | null}
        rulesError={rulesError}
      />
    </>
  )
}
