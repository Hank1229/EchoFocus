'use client'

import Link from 'next/link'
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'

const DemoContext = createContext(false)

// Mounted once, by app/demo/layout.tsx. Components that link into the
// dashboard or write data read it here instead of looking at the URL.
export function DemoProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value>{children}</DemoContext.Provider>
}

export function useDemo(): boolean {
  return useContext(DemoContext)
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
