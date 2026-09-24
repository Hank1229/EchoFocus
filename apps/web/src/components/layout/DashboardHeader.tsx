import Link from 'next/link'
import type { ReactNode } from 'react'

interface DashboardHeaderProps {
  title: string
  /** Page-level context or controls — the date and sync time on Today, the
      period switch on Trends. */
  context?: ReactNode
  userEmail?: string
  avatarUrl?: string
}

export default function DashboardHeader({ title, context, userEmail, avatarUrl }: DashboardHeaderProps) {
  const initial = userEmail?.charAt(0).toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-6 sm:gap-6">
        <h1 className="flex-shrink-0 text-title text-content">{title}</h1>

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
              className="pressable rounded-full ring-1 ring-line-strong hover:ring-accent"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="pressable flex h-7 w-7 items-center justify-center rounded-full border border-line-strong text-caption font-semibold text-content-secondary hover:border-accent hover:text-content">
              {initial}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
