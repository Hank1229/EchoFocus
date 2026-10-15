import { notFound } from 'next/navigation'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import TrendsScreen from '@/demo/TrendsScreen'

// Design-review harness for the Trends page. Dev only — production 404s.

// ?review=other shows the weekly review written in the other language.
export default async function TrendsPreviewPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { review } = await searchParams

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TrendsScreen reviewInOtherLanguage={review === 'other'} />
      </div>
    </div>
  )
}
