import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import GuideWalkthrough from '../../../dashboard/guide/GuideWalkthrough'

// Design-review harness for the Guide walkthrough. Dev only — production 404s.
export default async function GuidePreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const { t } = await getLocale()

  return (
    <div className="relative flex min-h-screen bg-canvas">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader title={t.guide.title} userEmail="preview@echofocus.dev" />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-8">
          <GuideWalkthrough />
        </main>
      </div>
    </div>
  )
}
