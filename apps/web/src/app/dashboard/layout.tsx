import DashboardSidebar from '@/components/layout/DashboardSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // slate-950 ground with slate-900 surfaces, matching the landing page — the
  // old slate-900 ground left every card floating without figure/ground.
  return (
    <div className="flex min-h-screen bg-slate-950">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
