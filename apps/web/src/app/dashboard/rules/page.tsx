import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import RulesEditor, { type Rule } from './RulesEditor'

export default async function RulesPage() {
  const supabase = await createClient()
  const { t } = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('custom_rules')
    .select('id, pattern, match_type, category')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <DashboardHeader
        title={t.rules.title}
        userEmail={user.email ?? undefined}
        avatarUrl={user.user_metadata?.avatar_url as string | undefined}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        <div className="max-w-3xl">
          <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{t.rules.intro}</p>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-slate-500">{t.rules.syncNote}</p>

          {error ? (
            <p role="alert" className="mt-8 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
              {t.rules.loadFailed}{error.message}
            </p>
          ) : (
            <RulesEditor userId={user.id} initialRules={(data ?? []) as Rule[]} />
          )}
        </div>
      </main>
    </>
  )
}
