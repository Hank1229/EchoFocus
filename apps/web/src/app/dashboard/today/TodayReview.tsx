'use client'

import { Flame } from 'lucide-react'
import { formatDuration } from '@echofocus/shared'
import { useLocale } from '@/lib/i18n'
import ScoreDial from '@/components/dashboard/ScoreDial'
import DailyInsight from './DailyInsight'

interface Props {
  totalSeconds: number
  focusScore: number
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  streak: { current: number; best: number }
  analysisText: string | null
  date: string
  canGenerate: boolean
  language: string
}

// The merged "Today's review" block — DESIGN.md section 8: data on top
// (total, score, category split), the AI insight below. The daily total is
// the page's single hero number.
export default function TodayReview({
  totalSeconds,
  focusScore,
  productiveSeconds,
  distractionSeconds,
  neutralSeconds,
  uncategorizedSeconds,
  streak,
  analysisText,
  date,
  canGenerate,
  language,
}: Props) {
  const { t } = useLocale()

  const neutral = neutralSeconds + uncategorizedSeconds
  const tracked = Math.max(productiveSeconds + distractionSeconds + neutral, 1)

  const parts = [
    { label: t.today.productive, seconds: productiveSeconds, dot: 'var(--productive)' },
    { label: t.today.breaksAndBrowsing, seconds: distractionSeconds, dot: 'var(--rest)' },
    { label: t.today.neutral, seconds: neutral, dot: 'var(--neutral)' },
  ]

  return (
    <section className="rounded-lg border border-line bg-surface p-6 sm:p-7">
      <h2 className="sr-only">{t.today.todaysReview}</h2>

      <div>
        <p className="text-caption text-content-secondary">{t.today.totalTracked}</p>
        <p className="mt-1 text-hero text-content">{formatDuration(totalSeconds)}</p>
        {streak.current > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-caption text-content-tertiary">
            <Flame size={13} strokeWidth={1.5} style={{ color: 'var(--productive)' }} />
            {t.today.streakDays.replace('{n}', String(streak.current))}
            {streak.best > streak.current && (
              <span>· {t.today.streakBest.replace('{n}', String(streak.best))}</span>
            )}
          </p>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <ScoreDial score={focusScore} label={t.today.focusScore} />
        {parts.map(part => (
          <div key={part.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-caption text-content-secondary">
              <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: part.dot }} />
              <span className="truncate">{part.label}</span>
            </dt>
            <dd className="mt-1 flex items-baseline gap-2">
              <span className="whitespace-nowrap text-stat text-content">{formatDuration(part.seconds)}</span>
              <span className="text-caption text-content-tertiary">
                {Math.round((part.seconds / tracked) * 100)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 border-t border-line pt-6">
        <DailyInsight
          analysisText={analysisText}
          date={date}
          canGenerate={canGenerate}
          language={language}
        />
      </div>
    </section>
  )
}
