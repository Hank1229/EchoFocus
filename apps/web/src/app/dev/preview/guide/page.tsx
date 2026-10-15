import { notFound } from 'next/navigation'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import GuideScreen from '@/demo/GuideScreen'

// Design-review harness for the Guide walkthrough. Dev only — production 404s.
export default async function GuidePreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <GuideScreen />
      </div>
    </div>
  )
}
