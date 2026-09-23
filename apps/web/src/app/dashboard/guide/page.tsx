import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import GuideWalkthrough from './GuideWalkthrough'

export default async function GuidePage() {
  const supabase = await createClient()
  const { t } = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Same column as every other page — the guide's old narrow centered measure
  // is what left it misaligned with the header and swimming in margin.
  return (
    <>
      <DashboardHeader
        title={t.guide.title}
        userEmail={user.email ?? undefined}
        avatarUrl={user.user_metadata?.avatar_url as string | undefined}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
        <GuideWalkthrough />
      </main>
    </>
  )
}
