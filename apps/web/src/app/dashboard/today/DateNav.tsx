import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  syncedLabel: string | null
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

export default function DateNav({ label, syncedLabel, prevHref, nextHref, prevAriaLabel, nextAriaLabel }: Props) {
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
            {syncedLabel}
          </>
        )}
      </p>
      <NavButton href={nextHref} ariaLabel={nextAriaLabel}>
        <ChevronRight size={14} strokeWidth={1.5} />
      </NavButton>
    </div>
  )
}
