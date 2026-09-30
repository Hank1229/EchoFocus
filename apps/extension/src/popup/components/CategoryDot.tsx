import React from 'react'
import type { Category } from '@echofocus/shared'

const COLORS: Record<Exclude<Category, 'uncategorized'>, string> = {
  productive: 'var(--productive)',
  distraction: 'var(--rest)',
  neutral: 'var(--neutral)',
}

// A categorized site gets a solid dot in its category color; an uncategorized
// one gets an empty ring, so "no rule yet" never passes for "neutral".
export default function CategoryDot({ category }: { category: Category | null }) {
  if (!category || category === 'uncategorized') {
    return <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full border-[1.5px] border-[var(--neutral)]" />
  }
  return <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: COLORS[category] }} />
}
