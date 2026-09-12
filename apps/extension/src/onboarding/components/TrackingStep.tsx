import React from 'react'
import { Coffee, Minus, Zap } from 'lucide-react'
import { useLocale } from '../../lib/i18n'
import StepHeading from './StepHeading'

// A worked example, not real data — the shares below add up to the 72 shown.
const EXAMPLE_SCORE = 72

export default function TrackingStep() {
  const { t } = useLocale()

  const buckets = [
    {
      Icon: Zap,
      title: t.onboarding.step1CategoryProductiveTitle,
      desc: t.onboarding.step1CategoryProductiveDesc,
      share: 56,
      accent: 'text-productive',
      fill: 'bg-productive-deep',
    },
    {
      Icon: Coffee,
      title: t.onboarding.step1CategoryBreaksTitle,
      desc: t.onboarding.step1CategoryBreaksDesc,
      share: 22,
      accent: 'text-breaks',
      fill: 'bg-breaks-deep',
    },
    {
      Icon: Minus,
      title: t.onboarding.step1CategoryNeutralTitle,
      desc: t.onboarding.step1CategoryNeutralDesc,
      share: 22,
      accent: 'text-neutral',
      fill: 'bg-neutral-deep',
    },
  ]

  return (
    <div>
      <StepHeading
        eyebrow={t.onboarding.step1Eyebrow}
        title={t.onboarding.step1Title}
        desc={t.onboarding.step1Desc}
      />

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t.onboarding.step1ScoreExample}
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              {t.onboarding.step1ScoreLabel}
            </span>
            <span className="text-xl font-bold leading-none tabular-nums text-brand-soft">{EXAMPLE_SCORE}</span>
          </span>
        </div>

        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-800">
          {buckets.map(({ title, share, fill }) => (
            <div key={title} className={`${fill} transition-all duration-700`} style={{ width: `${share}%` }} />
          ))}
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {buckets.map(({ Icon, title, desc, share, accent }) => (
            <li key={title} className="flex items-center gap-3">
              <Icon size={15} strokeWidth={2} className={`flex-shrink-0 ${accent}`} />
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium text-slate-200">{title}</span>
                <span className="ml-2 text-xs text-slate-500">{desc}</span>
              </span>
              <span className={`flex-shrink-0 text-xs font-semibold tabular-nums ${accent}`}>{share}%</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-500">{t.onboarding.step1ScoreNote}</p>
    </div>
  )
}
