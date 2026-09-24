'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  /** ISO timestamp of the last sync; formatted in the BROWSER so the shown
      time is the viewer's timezone, not the server's UTC. */
  syncedAtIso: string | null
  syncedPrefix: string
  locale: string
  prevHref: string | null
  nextHref: string | null
  prevAriaLabel: string
  nextAriaLabel: string
}

function NavButton({ href, ariaLabel, children }: { href: string | null; ariaLabel: string; children: ReactNode }) {
  if (!href) {
    return <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-content-tertiary opacity-40">{children}</span>
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="pressable flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-content-secondary hover:bg-surface-hover hover:text-content"
    >
      {children}
    </Link>
  )
}

export default function DateNav({ label, syncedAtIso, syncedPrefix, locale, prevHref, nextHref, prevAriaLabel, nextAriaLabel }: Props) {
  // Formatted only after mount: the server renders no time at all rather
  // than a UTC-shifted one that hydration would leave standing.
  const [syncedLabel, setSyncedLabel] = useState<string | null>(null)
  useEffect(() => {
    if (!syncedAtIso) return
    setSyncedLabel(
      new Date(syncedAtIso).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    )
  }, [syncedAtIso, locale])

  return (
    <div className="flex items-center gap-1.5">
      <NavButton href={prevHref} ariaLabel={prevAriaLabel}>
        <ChevronLeft size={14} strokeWidth={1.5} />
      </NavButton>
      <p className="truncate text-caption text-content-tertiary">
        <span className="text-content-secondary">{label}</span>
        {syncedLabel && (
          <>
            <span className="mx-2">·</span>
            {syncedPrefix} {syncedLabel}
          </>
        )}
      </p>
      <NavButton href={nextHref} ariaLabel={nextAriaLabel}>
        <ChevronRight size={14} strokeWidth={1.5} />
      </NavButton>
    </div>
  )
}
