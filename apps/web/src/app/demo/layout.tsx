import type { Metadata } from 'next'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import { DemoProvider } from '@/lib/demo'
import DemoBanner from '@/demo/DemoBanner'

// Sample data must never show up in search results as if it were someone's.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

// The public demo: the dashboard on the fixture week, for anyone with the
// link. No session, no Supabase, no edge function; middleware.ts skips /demo.
// DemoProvider keeps every dashboard link inside /demo.
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <div className="relative flex min-h-screen bg-canvas">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DemoBanner />
          {children}
        </div>
      </div>
    </DemoProvider>
  )
}
