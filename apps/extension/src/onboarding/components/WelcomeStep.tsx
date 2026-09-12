import React from 'react'
import { Radar, ShieldCheck, Sparkles } from 'lucide-react'
import { useLocale } from '../../lib/i18n'
import StepHeading from './StepHeading'

export default function WelcomeStep() {
  const { t } = useLocale()

  const cards = [
    { Icon: Radar, title: t.onboarding.step0Card0Title, desc: t.onboarding.step0Card0Desc },
    { Icon: ShieldCheck, title: t.onboarding.step0Card1Title, desc: t.onboarding.step0Card1Desc },
    { Icon: Sparkles, title: t.onboarding.step0Card2Title, desc: t.onboarding.step0Card2Desc },
  ]

  return (
    <div>
      <StepHeading
        eyebrow={t.onboarding.step0Eyebrow}
        title={t.onboarding.step0Title}
        desc={t.onboarding.step0Desc}
      />

      <ul className="mt-9 grid gap-3 sm:grid-cols-3">
        {cards.map(({ Icon, title, desc }) => (
          <li
            key={title}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-brand/40"
          >
            <Icon size={18} strokeWidth={1.75} className="text-brand" />
            <p className="mt-3 text-sm font-semibold text-slate-100">{title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
