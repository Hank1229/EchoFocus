import { formatDuration } from '@echofocus/shared'

export type SiteCategory = 'productive' | 'distraction' | 'neutral' | 'uncategorized'

export interface RankedSite {
  domain: string
  seconds: number
  category: SiteCategory
}

interface Props {
  heading: string
  sites: RankedSite[]
  emptyLabel: string
  /** Formatted total for the listed sites, shown beside the heading. */
  total?: string
}

const BAR: Record<SiteCategory, string> = {
  productive: 'bg-productive-deep',
  distraction: 'bg-breaks-deep',
  neutral: 'bg-neutral-deep',
  uncategorized: 'bg-neutral-deep',
}

// A ranked list, so it is set as a list: hairline rows, the bar carries both the
// relative weight and (by colour) the category, which retires the per-row icon
// and the repeated category caption.
export default function SiteRanking({ heading, sites, emptyLabel, total }: Props) {
  const ranked = [...sites].sort((a, b) => b.seconds - a.seconds).slice(0, 10)
  const leader = ranked[0]?.seconds ?? 1

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-slate-100">{heading}</h2>
        {total && <p className="text-xs tabular-nums text-slate-600">{total}</p>}
      </div>

      {ranked.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 grid border-t border-slate-800/80 lg:grid-cols-2 lg:gap-x-12">
          {ranked.map(site => (
            <li
              key={site.domain}
              className="flex items-center gap-4 border-b border-slate-800/80 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{site.domain}</span>
              <span aria-hidden className="h-[3px] w-16 flex-shrink-0 overflow-hidden rounded-full bg-slate-800 sm:w-24">
                <span
                  className={`block h-full rounded-full ${BAR[site.category]}`}
                  style={{ width: `${Math.max((site.seconds / leader) * 100, 4)}%` }}
                />
              </span>
              <span className="w-14 flex-shrink-0 text-right text-xs tabular-nums text-slate-500">
                {formatDuration(site.seconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
