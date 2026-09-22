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
  productive: 'var(--productive)',
  distraction: 'var(--rest)',
  neutral: 'var(--neutral)',
  uncategorized: 'var(--neutral)',
}

// A ranked list set as a list: hairline rows; the bar carries both relative
// weight and (by color) the category.
export default function SiteRanking({ heading, sites, emptyLabel, total }: Props) {
  const ranked = [...sites].sort((a, b) => b.seconds - a.seconds).slice(0, 10)
  const leader = ranked[0]?.seconds ?? 1

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-label text-content-secondary">{heading}</h2>
        {total && <p className="text-caption text-content-tertiary">{total}</p>}
      </div>

      {ranked.length === 0 ? (
        <p className="mt-4 text-body text-content-secondary">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 grid border-t border-line lg:grid-cols-2 lg:gap-x-12">
          {ranked.map(site => (
            <li key={site.domain} className="flex items-center gap-4 border-b border-line py-2.5">
              <span className="min-w-0 flex-1 truncate text-body text-content">{site.domain}</span>
              <span aria-hidden className="h-[3px] w-16 flex-shrink-0 overflow-hidden rounded-full bg-surface-hover sm:w-24">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max((site.seconds / leader) * 100, 4)}%`,
                    background: BAR[site.category],
                  }}
                />
              </span>
              <span className="w-14 flex-shrink-0 text-right text-caption text-content-tertiary">
                {formatDuration(site.seconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
