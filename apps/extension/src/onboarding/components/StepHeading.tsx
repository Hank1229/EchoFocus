import React from 'react'

interface StepHeadingProps {
  eyebrow: string
  title: string
  desc: string
}

export default function StepHeading({ eyebrow, title, desc }: StepHeadingProps) {
  return (
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
      <h1 className="mt-3 text-[28px] font-bold leading-tight text-slate-50">{title}</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">{desc}</p>
    </header>
  )
}
