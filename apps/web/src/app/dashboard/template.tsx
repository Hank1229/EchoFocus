'use client'

import { useEffect, useRef } from 'react'

// Remounts on every dashboard navigation (that is what a template.tsx is for)
// and plays one short fade-and-rise, so moving between pages feels like the
// page settling into place instead of a hard swap. The transition runs on the
// compositor only (opacity + transform) and is skipped for reduced motion.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    )
  }, [])

  return (
    <div ref={ref} className="flex min-w-0 flex-1 flex-col">
      {children}
    </div>
  )
}
