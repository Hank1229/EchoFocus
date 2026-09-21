import Link from 'next/link'
import type { ReactNode } from 'react'

interface DashboardHeaderProps {
  title: string
  /** Page-level context or controls — the date and sync time on Today, the
      period switch on Trends, the generate action on Snapshots. */
  context?: ReactNode
  userEmail?: string
  avatarUrl?: string
}

export default function DashboardHeader({ title, context, userEmail, avatarUrl }: DashboardHeaderProps) {
  const initial = userEmail?.charAt(0).toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-6 sm:gap-6">
        <h1 className="flex-shrink-0 font-display text-[1.375rem] font-semibold tracking-tight text-slate-100">{title}</h1>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
          {context}
        </div>

        <Link
          href="/dashboard/settings?tab=account"
          title={userEmail}
          className="flex-shrink-0"
          aria-label={userEmail ?? 'Profile'}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={28}
              height={28}
              className="rounded-full ring-1 ring-slate-700 transition-all hover:ring-brand/60"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-xs font-semibold text-slate-400 transition-colors hover:border-brand/60 hover:text-slate-200">
              {initial}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
