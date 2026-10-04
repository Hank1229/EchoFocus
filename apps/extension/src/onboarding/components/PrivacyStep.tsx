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
        {stays.map(({ Icon, title, desc }) => (
          <li key={title} className="flex gap-4 rounded-lg border border-line bg-surface p-4">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-line bg-canvas">
              <Icon size={17} strokeWidth={1.75} className="text-content-secondary" />
            </span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-content">{title}</span>
              <span className="mt-1 block text-caption leading-relaxed text-content-secondary">{desc}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <EyeOff size={16} strokeWidth={1.75} className="text-content-tertiary" />
          <span className="text-body font-semibold text-content-secondary">{t.onboarding.step2NeverTitle}</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {never.map(item => (
            <li
              key={item}
              className="rounded-full border border-line bg-canvas px-3 py-1 text-caption text-content-tertiary line-through decoration-[var(--border-strong)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 max-w-xl text-caption leading-relaxed text-content-tertiary">{t.onboarding.step2Footnote}</p>
    </div>
  )
}
