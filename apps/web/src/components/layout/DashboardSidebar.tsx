'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, TrendingUp, Lightbulb, Settings, Lock } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard/today', label: "Today's Overview", Icon: BarChart3 },
  { href: '/dashboard/trends', label: 'Trends', Icon: TrendingUp },
  { href: '/dashboard/ai-insights', label: 'Daily Snapshots', Icon: Lightbulb },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
]

export default function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-800 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="font-bold text-slate-100 tracking-wide text-sm">EchoFocus</span>
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
                  ? 'bg-green-500/10 text-green-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <item.Icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Privacy note */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-start gap-1.5">
          <Lock size={18} strokeWidth={1.75} className="text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Browsing data stored<br />only on your device
          </p>
        </div>
      </div>
    </aside>
  )
}
