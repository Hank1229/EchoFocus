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

interface DataPoint {
  date: string
  score: number
}

interface FocusScoreChartProps {
  data: DataPoint[]
}

// DESIGN.md section 8: 2px stroke, flat 6% area fill, horizontal-only 1px
// gridlines on --border, tooltip on --surface with the one floating shadow.

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="chart-tooltip rounded-md border border-line bg-surface px-3 py-2 text-caption"
      style={{ boxShadow: 'var(--shadow-float)' }}
    >
      <p className="text-content-tertiary">{label}</p>
      <p className="mt-0.5 text-label text-content">{payload[0].value}</p>
    </div>
  )
}

export default function FocusScoreChart({ data }: FocusScoreChartProps) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          minTickGap={16}
          dy={6}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
        {/* 70 is the strong-tier threshold — the one line worth marking. */}
        <ReferenceLine y={70} stroke="var(--text-tertiary)" strokeDasharray="3 5" strokeOpacity={0.55} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="var(--accent)"
          fillOpacity={0.06}
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
