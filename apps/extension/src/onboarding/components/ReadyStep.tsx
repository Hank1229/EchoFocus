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
      <StepHeading
        eyebrow={t.onboarding.step3Eyebrow}
        title={t.onboarding.step3Title}
        desc={t.onboarding.step3Desc}
      />

      <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-brand/30 bg-brand/[0.08] px-3.5 py-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
        <span className="text-xs font-medium text-brand-soft">{t.onboarding.step3LiveStatus}</span>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {unlocks.map(({ Icon, title, desc }) => (
          <li key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <Icon size={18} strokeWidth={1.75} className="text-brand" />
            <p className="mt-3 text-sm font-semibold text-slate-100">{title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-500">{t.onboarding.step3Footnote}</p>
    </div>
  )
}
