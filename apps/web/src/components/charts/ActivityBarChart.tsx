'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  productive: number
  distraction: number
  neutral: number
}

interface ActivityBarChartProps {
  data: DataPoint[]
}

const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="mb-0.5">
          {p.name}: {formatHours(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function ActivityBarChart({ data }: ActivityBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatHours} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend
          formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
          iconType="circle" iconSize={8}
        />
        <Bar dataKey="productive" name="Productive" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
        <Bar dataKey="distraction" name="Distraction" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
        <Bar dataKey="neutral" name="Neutral" stackId="a" fill="#475569" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
