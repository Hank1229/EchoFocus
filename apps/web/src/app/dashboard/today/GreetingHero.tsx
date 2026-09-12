'use client'

import { useLocale } from '@/lib/i18n'
import { formatDuration } from '@echofocus/shared'

interface Props {
  userName: string
  productiveSeconds: number
  focusScore: number
}

function getGreeting(hour: number, t: { goodMorning: string; goodAfternoon: string; goodEvening: string; goodNight: string }) {
  if (hour >= 5 && hour < 12) return t.goodMorning
  if (hour >= 12 && hour < 18) return t.goodAfternoon
  if (hour >= 18 && hour < 23) return t.goodEvening
  return t.goodNight
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-brand-soft'
  if (score >= 40) return 'text-brand'
  return 'text-brand-deep'
}

function scoreBg(score: number) {
  if (score >= 70) return 'bg-brand-soft/10'
  if (score >= 40) return 'bg-brand/10'
  return 'bg-brand-deep/10'
}

export default function GreetingHero({ userName, productiveSeconds, focusScore }: Props) {
  const { t } = useLocale()
  const hour = new Date().getHours()
  const greeting = getGreeting(hour, t.today as { goodMorning: string; goodAfternoon: string; goodEvening: string; goodNight: string })

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          {greeting}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t.today.focusedFor}{' '}
          <span className="text-productive font-semibold">{formatDuration(productiveSeconds)}</span>{' '}
          {t.today.todayTotalSuffix}
        </p>
      </div>

      <div className={`flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-5 py-3 ${scoreBg(focusScore)}`}>
        <span className={`text-3xl font-bold tabular-nums ${scoreColor(focusScore)}`}>{focusScore}</span>
        <span className="text-xs text-slate-500 mt-0.5">{t.today.pts}</span>
      </div>
    </div>
  )
}
