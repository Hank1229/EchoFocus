import React from 'react'
import { LayoutDashboard, LineChart, Sparkles } from 'lucide-react'
import { useLocale } from '../../lib/i18n'
import StepHeading from './StepHeading'

export default function ReadyStep() {
  const { t } = useLocale()

  const unlocks = [
    { Icon: LayoutDashboard, title: t.onboarding.step3Unlock0Title, desc: t.onboarding.step3Unlock0Desc },
    { Icon: Sparkles, title: t.onboarding.step3Unlock1Title, desc: t.onboarding.step3Unlock1Desc },
    { Icon: LineChart, title: t.onboarding.step3Unlock2Title, desc: t.onboarding.step3Unlock2Desc },
  ]

  return (
    <div>
      <StepHeading title={t.onboarding.step3Title} desc={t.onboarding.step3Desc} />

      <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-accent bg-accent/[0.08] px-3.5 py-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        <span className="text-xs font-medium text-accent">{t.onboarding.step3LiveStatus}</span>
      </div>

      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line">
        {unlocks.map(({ Icon, title, desc }) => (
          <li key={title} className="flex items-center gap-4 px-5 py-3.5">
            <Icon size={17} strokeWidth={1.75} className="flex-shrink-0 text-accent" />
            <span className="min-w-0 flex-1 text-sm font-medium text-content">{title}</span>
            <span className="hidden min-w-0 max-w-[18rem] flex-1 text-right text-xs leading-relaxed text-content-tertiary sm:block">
              {desc}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-xl text-xs leading-relaxed text-content-tertiary">{t.onboarding.step3Footnote}</p>
    </div>
  )
}
