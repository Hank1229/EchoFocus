'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { categoryColors, palette } from '@echofocus/shared'

interface DataPoint {
  date: string
  productive: number
  distraction: number
  neutral: number
}

interface ActivityBarChartProps {
  data: DataPoint[]
  labels: { productive: string; distraction: string; neutral: string }
}

const formatHours = (seconds: number) =>
  seconds === 0 ? '0' : `${(seconds / 3600).toFixed(1)}h`

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 text-slate-500">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2 text-slate-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="tabular-nums text-slate-400">{formatHours(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function ActivityBarChart({ data, labels }: ActivityBarChartProps) {
  const legend = [
    { label: labels.productive, color: categoryColors.productive },
    { label: labels.distraction, color: categoryColors.distraction },
    { label: labels.neutral, color: categoryColors.neutral },
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid stroke="#1e293b" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: palette.neutral.deep, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={16}
            dy={6}
          />
          <YAxis
            tickFormatter={formatHours}
            tick={{ fill: palette.neutral.deep, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
          <Bar dataKey="productive" name={labels.productive} stackId="a" fill={categoryColors.productive} maxBarSize={34} isAnimationActive={false} />
          <Bar dataKey="distraction" name={labels.distraction} stackId="a" fill={categoryColors.distraction} maxBarSize={34} isAnimationActive={false} />
          <Bar dataKey="neutral" name={labels.neutral} stackId="a" fill={categoryColors.neutral} radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>

      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        {legend.map(item => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-slate-500">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
