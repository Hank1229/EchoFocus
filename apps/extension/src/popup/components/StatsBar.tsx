import React from 'react'
import { formatDuration } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface CategoryColumnsProps {
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
}

// Small label + large number, one row, three columns — DESIGN.md section 7.
// The category color rides on the dot; the numbers stay on the text scale.
export function CategoryColumns({ productiveSeconds, distractionSeconds, neutralSeconds }: CategoryColumnsProps) {
  const { t } = useLocale()

  const columns = [
    { label: t.categories.categoryLabels.productive, seconds: productiveSeconds, dot: 'var(--productive)' },
    { label: t.categories.categoryLabels.distraction, seconds: distractionSeconds, dot: 'var(--rest)' },
    { label: t.categories.categoryLabels.neutral, seconds: neutralSeconds, dot: 'var(--neutral)' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {columns.map(column => (
        <div key={column.label} className="min-w-0">
          <p className="flex items-center gap-1.5 text-caption text-content-secondary">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: column.dot }}
            />
            <span className="truncate">{column.label}</span>
          </p>
          <p className="mt-1 whitespace-nowrap text-stat text-content">{formatDuration(column.seconds)}</p>
        </div>
      ))}
    </div>
  )
}
