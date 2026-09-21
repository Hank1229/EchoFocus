'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/lib/i18n'

export type SettingsTab = 'general' | 'categories' | 'privacy' | 'account' | 'about'

const TABS: SettingsTab[] = ['general', 'categories', 'privacy', 'account', 'about']

interface Props {
  initialTab: SettingsTab
  panels: Record<SettingsTab, React.ReactNode>
}

// One page, five panels — the extension options page's own taxonomy, so
// nothing about settings ever leaves the dashboard. All panels are fetched by
// the server page in one pass and mounted at once; switching is instant, and
// the underline slides between tabs on the silk curve.
export default function SettingsTabs({ initialTab, panels }: Props) {
  const { t } = useLocale()
  const [active, setActive] = useState<SettingsTab>(initialTab)
  const railRef = useRef<HTMLDivElement>(null)
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null)

  const labels: Record<SettingsTab, string> = {
    general: t.settings.tabGeneral,
    categories: t.settings.tabCategories,
    privacy: t.settings.tabPrivacy,
    account: t.settings.tabAccount,
    about: t.settings.tabAbout,
  }

  // The underline tracks the active button's box. Re-measured on tab change
  // and on resize; positions come from layout, so zh-TW's wider labels need
  // no per-locale numbers.
  useEffect(() => {
    const measure = () => {
      const rail = railRef.current
      const el = rail?.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`)
      if (rail && el) {
        setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active])

  const select = (tab: SettingsTab) => {
    setActive(tab)
    // Keep the tab linkable without a server round-trip.
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url)
  }

  return (
    <div>
      <div ref={railRef} className="relative flex gap-1 overflow-x-auto border-b border-slate-800/80" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            data-tab={tab}
            role="tab"
            aria-selected={active === tab}
            onClick={() => select(tab)}
            className={`pressable whitespace-nowrap px-4 py-3 text-sm font-medium ${
              active === tab ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {labels[tab]}
          </button>
        ))}
        {underline && (
          <span
            aria-hidden
            className="absolute bottom-0 h-[2px] rounded-full bg-brand shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-all duration-300 ease-silk"
            style={{ left: underline.left, width: underline.width }}
          />
        )}
      </div>

      {TABS.map(tab => (
        <div key={tab} role="tabpanel" hidden={active !== tab} className="pt-8">
          {active === tab && <div className="rise">{panels[tab]}</div>}
        </div>
      ))}
    </div>
  )
}
