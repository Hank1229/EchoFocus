'use client'

import { useLocale } from '@/lib/i18n'
import { formatDuration } from '@echofocus/shared'

interface Props {
  userName: string
  productiveSeconds: number
  focusScore: number
}

// The signature motif, used once per surface: concentric rings radiating out
// from the focus score, clipped by the panel edge.
const RINGS: [diameter: number, opacity: number][] = [
  [84, 0.5],
  [132, 0.3],
  [192, 0.18],
  [264, 0.1],
  [348, 0.06],
]

function getGreeting(hour: number, t: { goodMorning: string; goodAfternoon: string; goodEvening: string; goodNight: string }) {
  if (hour >= 5 && hour < 12) return t.goodMorning
  if (hour >= 12 && hour < 18) return t.goodAfternoon
  if (hour >= 18 && hour < 23) return t.goodEvening
  return t.goodNight
}

export default function GreetingHero({ userName, productiveSeconds, focusScore }: Props) {
  const { t } = useLocale()
  const hour = new Date().getHours()
  const greeting = getGreeting(hour, t.today as { goodMorning: string; goodAfternoon: string; goodEvening: string; goodNight: string })

  return (
    <div className="relative flex items-center justify-between gap-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-6 py-7">
      <div className="relative">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-100">
          {greeting}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {t.today.focusedFor}{' '}
          <span className="font-semibold text-productive tabular-nums">{formatDuration(productiveSeconds)}</span>{' '}
          {t.today.todayTotalSuffix}
        </p>
      </div>

      <div className="relative flex-shrink-0 pr-2 text-right">
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-0 block h-0 w-0">
          {RINGS.map(([d, o]) => (
            <span
              key={d}
              className="absolute rounded-full border border-brand"
              style={{ width: d, height: d, left: -d / 2, top: -d / 2, opacity: o }}
            />
          ))}
        </span>
        <p className="relative font-display text-5xl font-semibold leading-none tracking-tight text-slate-100 tabular-nums">
          {focusScore}
        </p>
        <p className="relative mt-1.5 text-xs text-slate-500">{t.today.pts}</p>
      </div>
    </div>
  )
}
