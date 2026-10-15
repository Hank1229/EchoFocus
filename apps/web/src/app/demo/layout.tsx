import DashboardSidebar from '@/components/layout/DashboardSidebar'
import { DemoProvider } from '@/lib/demo'
import DemoBanner from '@/demo/DemoBanner'

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
