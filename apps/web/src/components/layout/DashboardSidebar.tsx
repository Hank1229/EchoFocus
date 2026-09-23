'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Sun, TrendingUp, Compass, SlidersHorizontal, Lock } from 'lucide-react'
import { useLocale, type Language } from '@/lib/i18n'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { t, language, setLanguage } = useLocale()

  const navItems = [
    { href: '/dashboard/today', label: t.sidebar.todaysOverview, Icon: Sun },
    { href: '/dashboard/trends', label: t.sidebar.trends, Icon: TrendingUp },
    { href: '/dashboard/guide', label: t.sidebar.guide, Icon: Compass },
    { href: '/dashboard/settings', label: t.sidebar.settings, Icon: SlidersHorizontal },
  ]

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-shrink-0 flex-col border-r border-line bg-canvas md:w-52">
      <div className="flex h-16 items-center justify-center border-b border-line md:justify-start md:px-5">
        <Link href="/dashboard/today" className="flex items-center gap-2">
          <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={26} height={26} className="rounded-lg" />
          <span className="hidden text-label font-semibold text-content md:inline">EchoFocus</span>
        </Link>
      </div>

      <nav className="flex-1 py-3">
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={isActive ? 'page' : undefined}
              className={`pressable relative flex h-11 items-center justify-center gap-3 text-body md:justify-start md:px-5 ${
                isActive
                  ? 'bg-accent-subtle text-accent'
                  : 'text-content-secondary hover:bg-surface-hover hover:text-content'
              }`}
            >
              {isActive && <span aria-hidden className="absolute left-0 top-1.5 h-8 w-[2px] rounded-r bg-accent" />}
              <Icon size={17} strokeWidth={1.5} />
              <span className="hidden truncate md:inline">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-line px-3 py-5 md:px-5">
        <div className="flex justify-center gap-1 md:justify-start md:gap-0">
          {(['en', 'zh-TW'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              aria-pressed={language === lang}
              className={`pressable px-1.5 text-caption md:px-0 md:pr-4 ${
                language === lang ? 'text-content' : 'text-content-tertiary hover:text-content-secondary'
              }`}
            >
              {lang === 'en' ? 'EN' : '繁'}
            </button>
          ))}
        </div>
        <p className="hidden items-start gap-2 text-caption leading-relaxed text-content-tertiary md:flex">
          <Lock size={13} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
          <span>{t.sidebar.privacyNote}</span>
        </p>
      </div>
    </aside>
  )
}
