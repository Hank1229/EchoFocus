'use client'

import { scoreColorVar } from './score'

interface Props {
  score: number
  /** Caption above the numeral (e.g. "Focus score"). */
  label: string
}

// A quiet stat group: small label, tier-colored numeral. The score is the one
// number in the product whose color carries a reading.
export default function ScoreDial({ score, label }: Props) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-content-secondary">{label}</p>
      <p className="mt-1 text-stat tabular-nums" style={{ color: scoreColorVar(score) }}>
        {score}
      </p>
    </div>
  )
}
