import React from 'react'

interface StepHeadingProps {
  title: string
  desc: string
}

export default function StepHeading({ title, desc }: StepHeadingProps) {
  return (
    <header>
      <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-slate-50">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">{desc}</p>
    </header>
  )
}
