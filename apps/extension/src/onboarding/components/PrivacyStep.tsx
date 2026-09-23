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
      <StepHeading title={t.onboarding.step2Title} desc={t.onboarding.step2Desc} />

      <ol className="mt-8 flex flex-col gap-3">
        {stays.map(({ Icon, title, desc }, i) => (
          <li key={title} className="relative flex gap-4 rounded-2xl border border-brand/25 bg-accent/[0.06] p-4">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-accent bg-canvas">
              <Icon size={17} strokeWidth={1.75} className="text-accent" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-content">{title}</span>
              <span className="mt-1.5 block text-xs leading-relaxed text-content-secondary">{desc}</span>
            </span>
            {i === 0 && (
              <span className="absolute -bottom-3 left-[1.85rem] h-3 w-px bg-accent/30" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2.5">
          <EyeOff size={16} strokeWidth={1.75} className="text-content-tertiary" />
          <span className="text-sm font-semibold text-content-secondary">{t.onboarding.step2NeverTitle}</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {never.map(item => (
            <li
              key={item}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1 text-xs text-content-tertiary line-through decoration-[var(--border-strong)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 max-w-xl text-xs leading-relaxed text-content-tertiary">{t.onboarding.step2Footnote}</p>
    </div>
  )
}
