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
    return <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-slate-700">{children}</span>
  }
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
    >
      {children}
    </Link>
  )
}

export default function DateNav({ label, syncedLabel, prevHref, nextHref, prevAriaLabel, nextAriaLabel }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <NavButton href={prevHref} ariaLabel={prevAriaLabel}>
        <ChevronLeft size={14} strokeWidth={2} />
      </NavButton>
      <p className="truncate text-xs text-slate-500">
        <span className="text-slate-400">{label}</span>
        {syncedLabel && (
          <>
            <span className="mx-2 text-slate-700">/</span>
            {syncedLabel}
          </>
        )}
      </p>
      <NavButton href={nextHref} ariaLabel={nextAriaLabel}>
        <ChevronRight size={14} strokeWidth={2} />
      </NavButton>
    </div>
  )
}
