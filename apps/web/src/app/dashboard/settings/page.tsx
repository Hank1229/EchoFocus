import { createClient } from '@/lib/supabase/server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SettingsForm from './SettingsForm'
import DeleteCloudDataButton from './DeleteCloudDataButton'
import { redirect } from 'next/navigation'

interface UserPreference {
  email_report_enabled: boolean
  idle_timeout_minutes: number
  data_retention_days: number
  daily_goal_minutes: number
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('email_report_enabled, idle_timeout_minutes, data_retention_days, daily_goal_minutes')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <>
      <DashboardHeader title="Settings" userEmail={user?.email ?? undefined} />

      <main className="flex-1 px-6 py-8 max-w-xl space-y-6">
        {/* Profile */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-6 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Account</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 font-bold">{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{user?.email}</p>
              <p className="text-xs text-green-400 mt-0.5">Google Account</p>
            </div>
          </div>
        </section>

        {/* Preferences form (client component for interactivity) */}
        <SettingsForm userId={user!.id} initialPrefs={prefs as UserPreference ?? null} />

        {/* Danger zone */}
        <section className="rounded-2xl border border-red-500/20 bg-slate-900 shadow-sm p-6 space-y-3">
          <p className="text-xs text-red-400 uppercase tracking-wider">Reset</p>
          <p className="text-sm text-slate-400">
            Delete all synced data from the cloud. Your local extension data is not affected.
          </p>
          <DeleteCloudDataButton userId={user!.id} />
        </section>
      </main>
    </>
  )
}
