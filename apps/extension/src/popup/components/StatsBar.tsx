import React from 'react'
import { formatDuration } from '@echofocus/shared'

interface StatsBarProps {
  productiveSeconds: number
  distractionSeconds: number
  neutralSeconds: number
  uncategorizedSeconds: number
  totalSeconds: number
}

interface StatRowProps {
  label: string
  seconds: number
  color: string
  dotColor: string
}

function StatRow({ label, seconds, color, dotColor }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>
        {formatDuration(seconds)}
      </span>
    </div>
  )
}

export default function StatsBar({
  productiveSeconds,
  distractionSeconds,
  neutralSeconds,
  uncategorizedSeconds,
  totalSeconds,
}: StatsBarProps) {
  // Visual bar breakdown
  const total = Math.max(totalSeconds, 1)
  const productivePct = (productiveSeconds / total) * 100
  const distractionPct = (distractionSeconds / total) * 100
  const neutralPct = (neutralSeconds / total) * 100

  return (
    <div className="px-4 py-3 bg-slate-800/50 rounded-xl space-y-1">
      {/* Visual bar */}
      <div className="flex rounded-full overflow-hidden h-2 mb-3 bg-slate-700">
        {productivePct > 0 && (
          <div
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${productivePct}%` }}
          />
        )}
        {distractionPct > 0 && (
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${distractionPct}%` }}
          />
        )}
        {neutralPct > 0 && (
          <div
            className="bg-slate-500 transition-all duration-500"
            style={{ width: `${neutralPct}%` }}
          />
        )}
      </div>

      <StatRow
        label="生產效率"
        seconds={productiveSeconds}
        color="#22c55e"
        dotColor="#22c55e"
      />
      <StatRow
        label="分心時間"
        seconds={distractionSeconds}
        color="#ef4444"
        dotColor="#ef4444"
      />
      <StatRow
        label="中性瀏覽"
        seconds={neutralSeconds + uncategorizedSeconds}
        color="#94a3b8"
        dotColor="#64748b"
      />

      <div className="border-t border-slate-700 mt-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">今日總計</span>
          <span className="text-sm font-bold text-slate-200 tabular-nums">
            {formatDuration(totalSeconds)}
          </span>
        </div>
      </div>
    </div>
  )
}
