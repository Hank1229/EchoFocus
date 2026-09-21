import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import DashboardHeader from '@/components/layout/DashboardHeader'
import SnapshotList, { type Snapshot } from '../../../dashboard/ai-insights/SnapshotList'

// Design-review harness for the Daily Snapshots page. Dev only — production 404s.

const SNAPSHOTS: Snapshot[] = [
  {
    id: '1',
    kind: 'weekly',
    dateLabel: 'Sep 12 – Sep 18',
    analyzedLabel: 'Analyzed Sep 18, 21:04',
    score: 65,
    text: 'A week of two halves: Tuesday and Thursday carried you, with almost five focused hours each and your strongest single block landing Thursday afternoon. Sunday was the outlier — heavy browsing, a 39 score — but notably you recovered the very next day instead of letting it slide into Monday. Across the week your breaks stayed short and well-placed, which is exactly the pattern that makes long productive stretches sustainable. One thing to try next week: your mornings consistently start slow, with the first real block arriving after 9:30. Anchoring one fixed task at 9:00 — even a small one — would likely pull the whole day forward.',
  },
  {
    id: '2',
    kind: 'daily',
    dateLabel: 'Thursday, September 18',
    analyzedLabel: 'Analyzed Sep 18, 21:02',
    score: 76,
    text: 'You put together a genuinely strong day — over four hours of focused work, with your longest unbroken stretch landing mid-afternoon right where your energy usually peaks.',
  },
  {
    id: '3',
    kind: 'daily',
    dateLabel: 'Wednesday, September 17',
    analyzedLabel: 'Analyzed Sep 17, 21:02',
    score: 69,
    text: 'A steady day held back only by a scattered first hour. Once the morning settled, your blocks ran long and clean.',
  },
  {
    id: '4',
    kind: 'daily',
    dateLabel: 'Sunday, September 14',
    analyzedLabel: 'Analyzed Sep 14, 21:03',
    score: 39,
    text: 'A browsing-heavy day — and that is fine. Rest days show up in the data too; what matters is the pattern across the week, not one quiet Sunday.',
  },
]

export default async function SnapshotsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  const { t } = await getLocale()

  return (
    <div className="relative flex min-h-screen bg-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(45,212,191,0.05),transparent)]"
      />
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader title={t.aiInsights.title} userEmail="preview@echofocus.dev" />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-8">
          <div className="rise rise-2 mt-2">
            <SnapshotList snapshots={SNAPSHOTS} />
          </div>
        </main>
      </div>
    </div>
  )
}
