import { notFound } from 'next/navigation'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import SettingsScreen from '@/demo/SettingsScreen'

// Design-review harness for the whole Settings page, every tab, on fixture
// data (?tab= picks the panel). Saving against the fixture user id fails RLS
// by design: this page is for looking, not using. Dev only, production 404s.
export default async function SettingsPreviewPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { tab } = await searchParams

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SettingsScreen tab={tab} />
      </div>
    </div>
  )
}
