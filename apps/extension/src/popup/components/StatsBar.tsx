import React from 'react'
import { formatDuration } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface CategoryColumnsProps {
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
}

// Three centered columns on the status module's axis (DESIGN.md section 7) —
// the totals above carry the big numeral, so these stay body-sized. The
// category color rides on the dot; the numbers stay on the text scale.
export function CategoryColumns({ productiveSeconds, distractionSeconds, neutralSeconds }: CategoryColumnsProps) {
  const { t } = useLocale()

  const columns = [
    { label: t.categories.categoryLabels.productive, seconds: productiveSeconds, dot: 'var(--productive)' },
    { label: t.categories.categoryLabels.distraction, seconds: distractionSeconds, dot: 'var(--rest)' },
    { label: t.categories.categoryLabels.neutral, seconds: neutralSeconds, dot: 'var(--neutral)' },
  ]

  return (
    // The middle label ("Breaks & Browsing") is the long one; a symmetric
    // wider middle track keeps all three labels whole without moving the axis.
    <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-1">
      {columns.map(column => (
        <div key={column.label} className="flex min-w-0 flex-col items-center">
          <p className="flex max-w-full items-center gap-1 text-caption text-content-secondary">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: column.dot }}
            />
            <span className="truncate">{column.label}</span>
          </p>
          <p className="mt-1 whitespace-nowrap text-body font-semibold leading-tight text-content">
            {formatDuration(column.seconds)}
          </p>
        </div>
      ))}
    </div>
  )
}
