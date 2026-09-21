'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Sun, TrendingUp, BookOpen, Compass, SlidersHorizontal, Lock } from 'lucide-react'
import { useLocale, type Language } from '@/lib/i18n'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { t, language, setLanguage } = useLocale()

  const navItems = [
    { href: '/dashboard/today', label: t.sidebar.todaysOverview, Icon: Sun },
    { href: '/dashboard/trends', label: t.sidebar.trends, Icon: TrendingUp },
    { href: '/dashboard/ai-insights', label: t.sidebar.dailySnapshots, Icon: BookOpen },
    { href: '/dashboard/guide', label: t.sidebar.guide, Icon: Compass },
    { href: '/dashboard/settings', label: t.sidebar.settings, Icon: SlidersHorizontal },
  ]

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-shrink-0 flex-col border-r border-slate-800/80 bg-slate-950 md:w-52">
      <div className="flex h-16 items-center justify-center border-b border-slate-800/80 md:justify-start md:px-5">
        <Link href="/dashboard/today" className="flex items-center gap-2">
          <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={28} height={28} className="rounded-lg" />
          <span className="hidden font-display text-base font-semibold tracking-tight md:inline">
            <span className="text-slate-200">Echo</span><span className="text-brand">Focus</span>
          </span>
        </Link>
      </div>

      {/* Active state is a left edge marker, not a filled pill: the teal fill
          is the page's action colour and shouldn't sit idle in the chrome. */}
      <nav className="flex-1 py-3">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={isActive ? 'page' : undefined}
              className={`pressable relative flex h-11 items-center justify-center gap-3 text-sm md:justify-start md:px-5 ${
                isActive
                  ? 'bg-gradient-to-r from-brand/[0.08] to-transparent text-slate-100'
                  : 'text-slate-500 hover:bg-slate-900/60 hover:text-slate-300'
              }`}
            >
              {isActive && <span aria-hidden className="absolute left-0 top-1.5 h-8 w-[2px] rounded-r bg-brand shadow-[0_0_8px_rgba(45,212,191,0.5)]" />}
              <Icon size={17} strokeWidth={1.75} className={isActive ? 'text-brand' : ''} />
              <span className="hidden truncate md:inline">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800/80 px-3 py-4 md:px-5">
        <p className="hidden items-start gap-2 text-xs leading-relaxed text-slate-600 md:flex">
          <Lock size={13} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" />
          <span>{t.sidebar.privacyNote}</span>
        </p>
        <div className="mt-0 flex justify-center md:mt-3 md:justify-start">
          {(['en', 'zh-TW'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              aria-pressed={language === lang}
              className={`pressable px-1.5 text-xs md:px-0 md:pr-3 ${
                language === lang ? 'text-slate-300' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {lang === 'en' ? 'EN' : '繁'}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
