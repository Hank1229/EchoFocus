import React from 'react'
import { Radar, ShieldCheck, Sparkles } from 'lucide-react'
import { useLocale } from '../../lib/i18n'
import StepHeading from './StepHeading'
import EchoMark from './EchoMark'

export default function WelcomeStep() {
  const { t } = useLocale()

  const points = [
    { Icon: Radar, title: t.onboarding.step0Card0Title, desc: t.onboarding.step0Card0Desc },
    { Icon: ShieldCheck, title: t.onboarding.step0Card1Title, desc: t.onboarding.step0Card1Desc },
    { Icon: Sparkles, title: t.onboarding.step0Card2Title, desc: t.onboarding.step0Card2Desc },
  ]

  return (
    <div>
      <div className="flex items-center gap-10">
        <div className="min-w-0 flex-1">
          <StepHeading title={t.onboarding.step0Title} desc={t.onboarding.step0Desc} />
        </div>
        <EchoMark size={160} className="hidden flex-shrink-0 sm:block" />
      </div>

      <ul className="mt-10 border-t border-slate-800">
        {points.map(({ Icon, title, desc }) => (
          <li key={title} className="flex gap-4 border-b border-slate-800 py-4">
            <Icon size={17} strokeWidth={1.75} className="mt-0.5 flex-shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
