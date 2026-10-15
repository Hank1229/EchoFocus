'use client'

import Link from 'next/link'
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import { useLocale } from '@/lib/i18n'

const DemoContext = createContext(false)

// Mounted once, by app/demo/layout.tsx. Components that link into the
// dashboard or write data read it here instead of looking at the URL.
export function DemoProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value>{children}</DemoContext.Provider>
}

export function useDemo(): boolean {
  return useContext(DemoContext)
}

// For every control that writes data or calls an API: in the demo it is
// disabled and its title says why. Outside the demo both are inert.
export function useReadOnly(): { readOnly: boolean; title: string | undefined } {
  const readOnly = useDemo()
  const { t } = useLocale()
  return { readOnly, title: readOnly ? t.demo.readOnlyTitle : undefined }
}

// The small "Demo mode" line beside a disabled control; nothing outside the demo.
export function DemoNote({ className = '' }: { className?: string }) {
  const demo = useDemo()
  const { t } = useLocale()
  if (!demo) return null
  return <span className={`text-caption text-content-tertiary ${className}`}>{t.demo.readOnly}</span>
}

// For code above the provider (the root layout's theme sync).
export function isDemoPath(pathname: string): boolean {
  return pathname === '/demo' || pathname.startsWith('/demo/')
}

// Today is the demo's front page; every other dashboard path keeps its tail
// and query, so /dashboard/settings?tab=account becomes /demo/settings?tab=account.
export function demoHref(href: string): string {
  return href.replace(/^\/dashboard(\/today)?(?=[/?#]|$)/, '/demo')
}

export function useDashboardHref(): (href: string) => string {
  const demo = useDemo()
  return href => (demo ? demoHref(href) : href)
}

// A Link into the dashboard that stays inside /demo when rendered there.
export function DashboardLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  return <Link href={useDashboardHref()(href)} {...props} />
}
