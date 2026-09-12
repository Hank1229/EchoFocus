'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { scoreNumeralClass } from '@/components/dashboard/score'

export interface Snapshot {
  id: string
  kind: 'daily' | 'weekly'
  dateLabel: string
  analyzedLabel: string
  score: number
  text: string
}

function WeeklyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-md border border-brand/30 bg-brand/[0.06] px-1.5 py-0.5 text-[0.6875rem] font-medium text-brand">
      {label}
    </span>
  )
}

// Newest snapshot reads in full — it is what anyone opens this page for. The
// archive behind it stays a list of one-line rows that open on demand, instead
// of a stack of identical full-text cards.
export default function SnapshotList({ snapshots }: { snapshots: Snapshot[] }) {
  const { t } = useLocale()
  const [openId, setOpenId] = useState<string | null>(null)

  const [latest, ...earlier] = snapshots

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xs text-slate-500">{t.aiInsights.latestSnapshot}</h2>
        {/* Text left at a reading measure, meta in a rail on the right — the
            card carries its own margin note instead of trailing off empty. */}
        <article className="mt-3 grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 px-7 py-7 sm:px-9 lg:grid-cols-[1fr_10rem] lg:gap-12">
          <div className="flex items-baseline gap-5 lg:col-start-2 lg:row-start-1 lg:flex-col lg:items-start lg:gap-2">
            <p className={`font-display text-4xl font-semibold leading-none tabular-nums ${scoreNumeralClass(latest.score)}`}>
              {latest.score}
            </p>
            <div>
              <p className="flex items-center gap-2 text-sm text-slate-300">
                {latest.dateLabel}
                {latest.kind === 'weekly' && <WeeklyBadge label={t.aiInsights.weeklyReview} />}
              </p>
              <p className="mt-1 text-xs text-slate-600">{latest.analyzedLabel}</p>
            </div>
          </div>
          <p className="max-w-[62ch] text-[1.0625rem] leading-[1.7] text-slate-200 lg:col-start-1 lg:row-start-1">
            {latest.text}
          </p>
        </article>
      </section>

      {earlier.length > 0 && (
        <section>
          <h2 className="text-xs text-slate-500">{t.aiInsights.earlierSnapshots}</h2>
          <ul className="mt-3 border-t border-slate-800/80">
            {earlier.map(snapshot => {
              const isOpen = openId === snapshot.id
              return (
                <li key={snapshot.id} className="border-b border-slate-800/80">
                  <button
                    onClick={() => setOpenId(isOpen ? null : snapshot.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 py-3.5 text-left transition-colors hover:text-slate-100"
                  >
                    <span className="flex w-48 flex-shrink-0 items-center gap-2 text-sm text-slate-300">
                      {snapshot.dateLabel}
                      {snapshot.kind === 'weekly' && <WeeklyBadge label={t.aiInsights.weeklyReview} />}
                    </span>
                    <span className={`w-8 flex-shrink-0 font-display text-sm font-semibold tabular-nums ${scoreNumeralClass(snapshot.score)}`}>
                      {snapshot.score}
                    </span>
                    {/* Kept in the flow when open so the chevron holds its
                        column instead of snapping left. */}
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-500">
                      {isOpen ? '' : snapshot.text}
                    </span>
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      aria-hidden
                      className={`flex-shrink-0 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="max-w-[62ch] pb-6 text-[0.9375rem] leading-[1.7] text-slate-400 sm:ml-[14rem]">
                      {snapshot.text}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
