import React from 'react'

interface FocusScoreRingProps {
  score: number  // 0-100
  size?: number
}

export default function FocusScoreRing({ score, size = 120 }: FocusScoreRingProps) {
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  // Color based on score
  let ringColor: string
  let scoreColor: string
  let label: string
  if (score >= 70) {
    ringColor = '#22c55e'    // green
    scoreColor = '#22c55e'
    label = '優秀'
  } else if (score >= 40) {
    ringColor = '#f59e0b'    // amber
    scoreColor = '#f59e0b'
    label = '普通'
  } else {
    ringColor = '#ef4444'    // red
    scoreColor = '#ef4444'
    label = '待改善'
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {/* Score text overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span
            className="text-3xl font-bold tabular-nums leading-none"
            style={{ color: scoreColor }}
          >
            {score}
          </span>
          <span className="text-xs text-slate-400 mt-0.5">分</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium text-slate-400">專注評分</p>
        <p className="text-xs font-semibold" style={{ color: scoreColor }}>{label}</p>
      </div>
    </div>
  )
}
