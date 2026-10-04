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
      color: 'var(--productive)',
    },
    {
      Icon: Coffee,
      title: t.onboarding.step1CategoryBreaksTitle,
      desc: t.onboarding.step1CategoryBreaksDesc,
      share: 22,
      color: 'var(--rest)',
    },
    {
      Icon: Minus,
      title: t.onboarding.step1CategoryNeutralTitle,
      desc: t.onboarding.step1CategoryNeutralDesc,
      share: 22,
      color: 'var(--neutral)',
    },
  ]

  return (
    <div>
      <StepHeading title={t.onboarding.step1Title} desc={t.onboarding.step1Desc} />

      <div className="mt-8 rounded-lg border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption text-content-tertiary">{t.onboarding.step1ScoreExample}</span>
          <span className="flex items-baseline gap-2">
            <span className="text-caption text-content-tertiary">{t.onboarding.step1ScoreLabel}</span>
            <span className="text-stat leading-none tabular-nums" style={{ color: 'var(--productive)' }}>
              {EXAMPLE_SCORE}
            </span>
          </span>
        </div>

        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-surface">
          {buckets.map(({ title, share, color }) => (
            <div key={title} style={{ width: `${share}%`, background: color }} />
          ))}
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {buckets.map(({ Icon, title, desc, share, color }) => (
            <li key={title} className="flex items-center gap-3">
              <Icon size={15} strokeWidth={2} className="flex-shrink-0" style={{ color }} />
              <span className="min-w-0 flex-1">
                <span className="text-body font-medium text-content">{title}</span>
                <span className="ml-2 text-caption text-content-tertiary">{desc}</span>
              </span>
              <span className="flex-shrink-0 text-caption font-semibold tabular-nums" style={{ color }}>{share}%</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 max-w-xl text-caption leading-relaxed text-content-tertiary">{t.onboarding.step1ScoreNote}</p>
    </div>
  )
}
