import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Chrome, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'

export default async function GuidePage() {
  const supabase = await createClient()
  const { t } = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const g = t.guide

  const categories = [g.categoriesProductive, g.categoriesBreaks, g.categoriesNeutral]

  const homes = [
    { Icon: Chrome, where: g.whereExtension, items: g.whereExtensionItems },
    { Icon: LayoutDashboard, where: g.whereDashboard, items: g.whereDashboardItems },
  ]

  return (
    <>
      <DashboardHeader
        title={g.title}
        userEmail={user.email ?? undefined}
        avatarUrl={user.user_metadata?.avatar_url as string | undefined}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20 pt-8">
        <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{g.intro}</p>

        <section className="mt-12 border-t border-slate-800/80 pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-100">{g.whereTitle}</h2>
          <dl className="mt-5 grid gap-6 sm:grid-cols-2">
            {homes.map(home => (
              <div key={home.where}>
                <dt className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <home.Icon size={15} strokeWidth={1.75} className="text-brand" />
                  {home.where}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-400">{home.items}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-slate-500">{g.whereSyncNote}</p>
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-slate-500">{g.whereNote}</p>
        </section>

        <section className="mt-10 border-t border-slate-800/80 pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-100">{g.howTitle}</h2>
          <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{g.howBody}</p>
        </section>

        <section className="mt-10 border-t border-slate-800/80 pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-100">{g.scoreTitle}</h2>
          <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{g.scoreBody}</p>
        </section>

        <section className="mt-10 border-t border-slate-800/80 pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-100">{g.categoriesTitle}</h2>
          <ul className="mt-4 space-y-2.5">
            {categories.map((line, i) => (
              <li key={line} className="flex items-baseline gap-2.5 text-sm text-slate-300">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 flex-shrink-0 translate-y-[-2px] rounded-full ${
                    ['bg-productive', 'bg-breaks', 'bg-neutral-deep'][i]
                  }`}
                />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-slate-500">{g.categoriesNote}</p>

          <Link
            href="/dashboard/rules"
            className="mt-4 inline-block text-sm text-brand transition-colors hover:text-brand-soft"
          >
            {g.linkRules}
          </Link>
        </section>

        <section className="mt-10 border-t border-slate-800/80 pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-slate-100">{g.privacyTitle}</h2>
          <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-400">{g.privacyBody}</p>

          <h3 className="mt-7 text-sm font-medium text-slate-200">{g.privacyLeavesTitle}</h3>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-slate-400">{g.privacyLeaves}</p>

          <Link href="/privacy" className="mt-5 inline-block text-sm text-brand transition-colors hover:text-brand-soft">
            {g.linkPrivacy}
          </Link>
        </section>
      </main>
    </>
  )
}
