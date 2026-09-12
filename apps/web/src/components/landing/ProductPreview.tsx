import { Sparkles } from 'lucide-react'
import { formatDuration } from '@echofocus/shared'
import type { Locale } from '@/lib/i18n-server'

// A mock of one synced day, sized to look like a real dashboard card.
// Durations run through formatDuration so the preview reads exactly like
// the dashboard does.
const DAY = {
  focusScore: 82,
  productiveSeconds: 17520,
  breaksSeconds: 3960,
  neutralSeconds: 2880,
  sites: [
    { domain: 'github.com', seconds: 8040, dot: 'bg-productive' },
    { domain: 'figma.com', seconds: 5880, dot: 'bg-productive' },
    { domain: 'youtube.com', seconds: 2460, dot: 'bg-breaks' },
  ],
}

const TOTAL = DAY.productiveSeconds + DAY.breaksSeconds + DAY.neutralSeconds

export default function ProductPreview({ copy }: { copy: Locale['landing']['preview'] }) {
  const bars = [
    { label: copy.deepWork, seconds: DAY.productiveSeconds, bar: 'bg-productive-deep', dot: 'bg-productive' },
    { label: copy.breaks, seconds: DAY.breaksSeconds, bar: 'bg-breaks-deep', dot: 'bg-breaks' },
    { label: copy.neutral, seconds: DAY.neutralSeconds, bar: 'bg-neutral-deep', dot: 'bg-neutral' },
  ]

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{copy.day}</p>
        <p className="text-xs text-slate-600 tabular-nums">{formatDuration(TOTAL)}</p>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <p className="text-5xl font-semibold tabular-nums leading-none text-slate-100">{DAY.focusScore}</p>
        <div className="pb-0.5">
          <p className="text-sm text-slate-300">{copy.scoreLabel}</p>
          <p className="text-xs text-brand">{copy.scoreDelta}</p>
        </div>
      </div>

      <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-slate-800">
        {bars.map(b => (
          <div key={b.label} className={b.bar} style={{ width: `${(b.seconds / TOTAL) * 100}%` }} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
              <span className="truncate text-xs text-slate-500">{b.label}</span>
            </div>
            <p className="mt-1 text-sm text-slate-300 tabular-nums">{formatDuration(b.seconds)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-slate-800 pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{copy.topSites}</p>
        <ul className="mt-3 space-y-2.5">
          {DAY.sites.map(s => (
            <li key={s.domain} className="flex items-center gap-2.5">
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${s.dot}`} />
              <span className="flex-1 truncate text-sm text-slate-300">{s.domain}</span>
              <span className="text-xs text-slate-500 tabular-nums">{formatDuration(s.seconds)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-xl border border-brand/20 bg-brand/5 p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} strokeWidth={1.75} className="text-brand" />
          <p className="text-xs font-medium uppercase tracking-wider text-brand">{copy.aiLabel}</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{copy.aiText}</p>
      </div>
    </div>
  )
}
