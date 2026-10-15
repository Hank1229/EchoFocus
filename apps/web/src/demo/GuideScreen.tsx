import { getLocale } from '@/lib/i18n-server'
import DashboardHeader from '@/components/layout/DashboardHeader'
import GuideWalkthrough from '../app/dashboard/guide/GuideWalkthrough'
import { PREVIEW_USER } from './fixtures'

// The Guide walkthrough below the sidebar, for /demo and /dev/preview.
export default async function GuideScreen() {
  const { t } = await getLocale()

  return (
    <>
      <DashboardHeader title={t.guide.title} userEmail={PREVIEW_USER.email} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-8">
        <GuideWalkthrough />
      </main>
    </>
  )
}
