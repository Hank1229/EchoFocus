import type { ReactNode } from 'react'

interface Props {
  label: string
  description?: string
  children: ReactNode
  /** Stack the control under the label — for wide controls like sliders. */
  stack?: boolean
}

// Settings are a list of name/description/control triples, so they are set as
// a definition list with hairline rules rather than walled cards.
export default function SettingRow({ label, description, children, stack }: Props) {
  return (
    <div
      className={`grid gap-x-10 gap-y-3 border-b border-line py-6 ${
        stack ? 'sm:grid-cols-[16rem_1fr]' : 'sm:grid-cols-[16rem_1fr] sm:items-start'
      }`}
    >
      <div>
        <dt className="text-label text-content">{label}</dt>
        {description && <dd className="mt-1.5 text-caption leading-relaxed text-content-tertiary">{description}</dd>}
      </div>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
