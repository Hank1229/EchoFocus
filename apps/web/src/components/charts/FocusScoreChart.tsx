'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { palette } from '@echofocus/shared'

interface DataPoint {
  date: string
  score: number
}

interface FocusScoreChartProps {
  data: DataPoint[]
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-slate-500">{label}</p>
      <p className="mt-0.5 font-display text-base font-semibold tabular-nums text-slate-100">{payload[0].value}</p>
    </div>
  )
}

export default function FocusScoreChart({ data }: FocusScoreChartProps) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.brand.DEFAULT} stopOpacity={0.22} />
            <stop offset="100%" stopColor={palette.brand.DEFAULT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1b2622" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: palette.neutral.deep, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={16}
          dy={6}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tick={{ fill: palette.neutral.deep, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2e3b36', strokeDasharray: '2 4' }} />
        <ReferenceLine y={70} stroke={palette.neutral.deep} strokeDasharray="3 5" strokeOpacity={0.55} />
        <Area
          type="monotone"
          dataKey="score"
          stroke={palette.brand.DEFAULT}
          strokeWidth={2}
          fill="url(#scoreFill)"
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: palette.brand.DEFAULT, stroke: '#070c0a', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
