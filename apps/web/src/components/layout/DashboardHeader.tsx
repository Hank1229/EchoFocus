'use client'

import Image from 'next/image'
import Link from 'next/link'

interface DashboardHeaderProps {
  title: string
  userEmail?: string
  avatarUrl?: string
}

export default function DashboardHeader({ title: _title, userEmail, avatarUrl }: DashboardHeaderProps) {
  const initial = userEmail?.charAt(0).toUpperCase() ?? '?'

  return (
    <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <Link href="/dashboard/today" className="flex items-center gap-2">
        <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={32} height={32} className="rounded-lg" />
        <span className="hidden font-display text-base font-semibold tracking-tight md:inline">
          <span className="text-slate-200">Echo</span><span className="text-brand">Focus</span>
        </span>
      </Link>

      <Link href="/dashboard/settings" title={userEmail}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Profile"
            width={32}
            height={32}
            className="rounded-full ring-1 ring-slate-700 hover:ring-brand/50 transition-all"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center hover:border-brand/60 transition-colors">
            <span className="text-sm font-bold text-brand">{initial}</span>
          </div>
        )}
      </Link>
    </header>
  )
}
