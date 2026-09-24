'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDuration } from '@echofocus/shared'

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

const COLORS = {
  productive: 'var(--productive)',
  distraction: 'var(--rest)',
  neutral: 'var(--neutral)',
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
    <div
      className="chart-tooltip rounded-md border border-line bg-surface px-3 py-2 text-caption"
      style={{ boxShadow: 'var(--shadow-float)' }}
    >
      <p className="mb-1.5 text-content-tertiary">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2 text-content-secondary">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="text-content">{formatDuration(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function ActivityBarChart({ data, labels }: ActivityBarChartProps) {
  const legend = [
    { label: labels.productive, color: COLORS.productive },
    { label: labels.distraction, color: COLORS.distraction },
    { label: labels.neutral, color: COLORS.neutral },
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barCategoryGap="20%">
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
            tickFormatter={formatHours}
            tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
          <Bar dataKey="productive" name={labels.productive} stackId="a" fill="var(--fill-productive)" maxBarSize={34} isAnimationActive={false} />
          <Bar dataKey="distraction" name={labels.distraction} stackId="a" fill="var(--fill-rest)" maxBarSize={34} isAnimationActive={false} />
          <Bar dataKey="neutral" name={labels.neutral} stackId="a" fill="var(--fill-neutral)" radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>

      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        {legend.map(item => (
          <li key={item.label} className="flex items-center gap-2 text-caption text-content-tertiary">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
