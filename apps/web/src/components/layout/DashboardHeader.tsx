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
        <span className="font-bold text-sm tracking-wide hidden md:inline">
          <span style={{ color: '#E2E8F0' }}>Echo</span><span style={{ color: '#2DD4BF' }}>Focus</span>
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
            className="rounded-full ring-1 ring-slate-700 hover:ring-green-500/50 transition-all"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center hover:border-green-500/60 transition-colors">
            <span className="text-sm font-bold text-green-400">{initial}</span>
          </div>
        )}
      </Link>
    </header>
  )
}
