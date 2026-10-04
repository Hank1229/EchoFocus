import React from 'react'

interface StepHeadingProps {
  title: string
  desc: string
}

export default function StepHeading({ title, desc }: StepHeadingProps) {
  return (
    <header>
      <h1 className="text-hero text-content">{title}</h1>
      <p className="mt-4 max-w-xl text-body text-content-secondary">{desc}</p>
    </header>
  )
}
