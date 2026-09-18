import DashboardSidebar from '@/components/layout/DashboardSidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // slate-950 ground with slate-900 surfaces, matching the landing page — the
  // old slate-900 ground left every card floating without figure/ground.
  return (
    <div className="relative flex min-h-screen bg-slate-950">
      {/* One lamp above the page: a faint teal radial that gives the black
          its depth. Decorative only, and deliberately the page's single wash. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(45,212,191,0.05),transparent)]"
      />
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
