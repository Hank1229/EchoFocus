import { notFound } from 'next/navigation'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import TodayScreen from '@/demo/TodayScreen'

// Design-review harness: the Today page with fixture data and no auth, so the
// dashboard can be screenshotted and iterated on without a signed-in session.
// Dev only — production 404s. /demo shows the same screen in production.

// ?insight=other shows the insight written in the other language, the state
// that offers to regenerate it in the page's language.
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ insight?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { insight } = await searchParams

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TodayScreen insightInOtherLanguage={insight === 'other'} />
      </div>
    </div>
  )
}
