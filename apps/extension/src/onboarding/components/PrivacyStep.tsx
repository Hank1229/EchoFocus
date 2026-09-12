import React from 'react'
import { CloudUpload, EyeOff, HardDrive } from 'lucide-react'
import { useLocale } from '../../lib/i18n'
import StepHeading from './StepHeading'

export default function PrivacyStep() {
  const { t } = useLocale()

  const stays = [
    { Icon: HardDrive, title: t.onboarding.step2Stay0Title, desc: t.onboarding.step2Stay0Desc },
    { Icon: CloudUpload, title: t.onboarding.step2Stay1Title, desc: t.onboarding.step2Stay1Desc },
  ]

  const never = [
    t.onboarding.step2Never0,
    t.onboarding.step2Never1,
    t.onboarding.step2Never2,
    t.onboarding.step2Never3,
  ]

  return (
    <div>
      <StepHeading
        eyebrow={t.onboarding.step2Eyebrow}
        title={t.onboarding.step2Title}
        desc={t.onboarding.step2Desc}
      />

      <ol className="mt-8 flex flex-col gap-3">
        {stays.map(({ Icon, title, desc }, i) => (
          <li key={title} className="relative flex gap-4 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-slate-950">
              <Icon size={17} strokeWidth={1.75} className="text-brand" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-100">{title}</span>
              <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">{desc}</span>
            </span>
            {i === 0 && (
              <span className="absolute -bottom-3 left-[1.85rem] h-3 w-px bg-brand/30" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2.5">
          <EyeOff size={16} strokeWidth={1.75} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-300">{t.onboarding.step2NeverTitle}</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {never.map(item => (
            <li
              key={item}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-500 line-through decoration-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-500">{t.onboarding.step2Footnote}</p>
    </div>
  )
}
