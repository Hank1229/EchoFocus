import DashboardSidebar from '@/components/layout/DashboardSidebar'
import ExtensionBridge from '@/components/ExtensionBridge'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-canvas">
      <ExtensionBridge />
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
