'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, TrendingUp, BookOpen, User, Lock } from 'lucide-react'
import Image from 'next/image'
import { useLocale, type Language } from '@/lib/i18n'

export default function DashboardSidebar() {
  const pathname = usePathname()
  const { t, language, setLanguage } = useLocale()

  const NAV_ITEMS = [
    { href: '/dashboard/today', label: t.sidebar.todaysOverview, Icon: Sun },
    { href: '/dashboard/trends', label: t.sidebar.trends, Icon: TrendingUp },
    { href: '/dashboard/ai-insights', label: t.sidebar.dailySnapshots, Icon: BookOpen },
    { href: '/dashboard/settings', label: t.sidebar.profile, Icon: User },
  ]

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh-TW' : 'en' as Language)
  }

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-800 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <Link href="/dashboard/today" className="flex items-center gap-2">
          <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={32} height={32} className="rounded-lg" />
          <span className="font-bold text-sm tracking-wide">
            <span className="text-slate-200">Echo</span><span className="text-brand">Focus</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <item.Icon
                size={18}
                strokeWidth={1.75}
                className={isActive ? 'text-brand' : 'text-neutral/60'}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Privacy note + language toggle */}
      <div className="px-4 py-4 border-t border-slate-800 space-y-3">
        <div className="flex items-start gap-1.5">
          <Lock size={18} strokeWidth={1.75} className="text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.sidebar.privacyNote.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 ? <br /> : null}</span>
            ))}
          </p>
        </div>
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors font-medium"
          title={language === 'en' ? '切換至繁體中文' : 'Switch to English'}
        >
          {language === 'en' ? 'EN | 繁' : '繁 | EN'}
        </button>
      </div>
    </aside>
  )
}
