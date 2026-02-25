'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard/today', label: '今日概覽', icon: '📊' },
  { href: '/dashboard/trends', label: '趨勢分析', icon: '📈' },
  { href: '/dashboard/ai-insights', label: 'AI 洞察', icon: '🤖' },
  { href: '/dashboard/settings', label: '帳戶設定', icon: '⚙️' },
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
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Privacy note */}
      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-600 leading-relaxed">
          🔒 瀏覽資料僅儲存<br />於您的本機裝置
        </p>
      </div>
    </aside>
  )
}
