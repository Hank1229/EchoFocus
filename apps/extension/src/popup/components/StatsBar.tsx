import React from 'react'
import { formatDuration } from '@echofocus/shared'
import { Zap, Coffee, Minus } from 'lucide-react'

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
  icon: React.ReactNode
}

function StatRow({ label, seconds, color, icon }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
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
            className="bg-orange-500 transition-all duration-500"
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
        label="Productive"
        seconds={productiveSeconds}
        color="#34d399"
        icon={<Zap size={18} strokeWidth={1.75} className="text-emerald-400" />}
      />
      <StatRow
        label="Breaks & Browsing"
        seconds={distractionSeconds}
        color="#fb923c"
        icon={<Coffee size={18} strokeWidth={1.75} className="text-orange-400" />}
      />
      <StatRow
        label="Neutral"
        seconds={neutralSeconds + uncategorizedSeconds}
        color="#94a3b8"
        icon={<Minus size={18} strokeWidth={1.75} className="text-slate-400" />}
      />

      <div className="border-t border-slate-700 mt-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Today's Total</span>
          <span className="text-sm font-bold text-slate-200 tabular-nums">
            {formatDuration(totalSeconds)}
          </span>
        </div>
      </div>
    </div>
  )
}
