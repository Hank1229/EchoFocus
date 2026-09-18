'use client'

import { useEffect, useRef, useState } from 'react'
import { scoreNumeralClass, scoreRingClass } from './score'

// The echo-rings motif — concentric rings radiating out from the focus score.
// Used exactly once in the dashboard (Today's verdict band), mirroring the
// landing hero so the two surfaces read as one product.
const RINGS: [diameter: number, opacity: number][] = [
  [140, 0.3],
  [212, 0.18],
  [300, 0.1],
  [404, 0.055],
  [524, 0.022],
]

const COUNT_MS = 700

// The numeral counts up once on mount — the page's single orchestrated
// moment, timed to land as the waveform finishes its sweep. Skipped (renders
// the final value immediately) under prefers-reduced-motion.
function useCountUp(target: number): number {
  const [value, setValue] = useState(target)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_MS, 1)
      // easeOutQuint — the numeral sprints then settles, like a meter.
      const eased = 1 - Math.pow(1 - progress, 5)
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setValue(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

interface Props {
  score: number
  /** Accessible caption rendered under the numeral (e.g. "Focus score"). */
  label: string
}

export default function ScoreDial({ score, label }: Props) {
  const shown = useCountUp(score)

  return (
    <div className="flex-shrink-0">
      <div className="relative grid h-[132px] w-[132px] place-items-center">
        {/* Anchored on the NUMERAL square's centre, never the outer box — the
            caption below would otherwise drag the ring centre down with it. */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-0 block h-0 w-0">
          {RINGS.map(([d, o]) => (
            <span
              key={d}
              className={`absolute rounded-full border ${scoreRingClass(score)}`}
              style={{ width: d, height: d, left: -d / 2, top: -d / 2, opacity: o }}
            />
          ))}
        </span>

        {/* Bricolage Grotesque sets digits high in the line box: at 80px with
            leading-none the ink centre lands ~1px above the box centre and the
            digits read as floating. Measured against the ring centre, not
            guessed — mt-[2px] lands the ink within 0.1px of it. */}
        <span
          aria-label={String(score)}
          className={`relative mt-[2px] font-display text-[5rem] font-semibold leading-none tracking-tight tabular-nums ${scoreNumeralClass(score)}`}
        >
          <span aria-hidden>{shown}</span>
        </span>
      </div>

      <p className="relative mt-3 text-center text-xs text-slate-500">{label}</p>
    </div>
  )
}
