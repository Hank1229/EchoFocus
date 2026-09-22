import React, { useCallback } from 'react'
import { Moon, Settings as SettingsIcon } from 'lucide-react'
import iconSrc from '../assets/icon-32.png'
import { useTodayStats } from './hooks/useTodayStats'
import { usePomodoro } from './hooks/usePomodoro'
import StatusModule from './components/StatusModule'
import { CategoryColumns } from './components/StatsBar'
import DomainList from './components/DomainList'
import TrackingToggle from './components/TrackingToggle'
import PopupWaveform from './components/PopupWaveform'
import type { Category } from '@echofocus/shared'
import { useLocale, type Language } from '../lib/i18n'
import { DASHBOARD_URL } from '../lib/config'
import { sendMessage } from '../lib/messaging'

const DOTS: Record<Category, string> = {
  productive: 'var(--productive)',
  distraction: 'var(--rest)',
  neutral: 'var(--neutral)',
  uncategorized: 'var(--neutral)',
}

export default function App() {
  const { t, language, setLanguage } = useLocale()
  const { aggregate, trackingState, currentSession, isLoading, refreshAggregate, refreshTrackingState } = useTodayStats()
  const { pomodoro, remainingMs, command } = usePomodoro()

  const toggleTracking = useCallback(async () => {
    await sendMessage('TOGGLE_TRACKING')
    await Promise.all([refreshAggregate(), refreshTrackingState()])
  }, [refreshAggregate, refreshTrackingState])

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh-TW' : 'en' as Language)
  }

  const isTracking = trackingState?.isTracking ?? false
  const topDomains = aggregate?.topDomains ?? []

  // The current session is not yet in the stored aggregate — fold it in so
  // the popup reads live.
  const currentCategory = currentSession?.category ?? null
  const currentElapsed = currentSession?.elapsedSeconds ?? 0

  let productiveSeconds = aggregate?.productiveSeconds ?? 0
  let distractionSeconds = aggregate?.distractionSeconds ?? 0
  let totalSeconds = aggregate?.totalSeconds ?? 0
  const neutralSeconds = (aggregate?.neutralSeconds ?? 0) + (aggregate?.uncategorizedSeconds ?? 0)

  if (currentCategory && currentElapsed > 0) {
    totalSeconds += currentElapsed
    if (currentCategory === 'productive') productiveSeconds += currentElapsed
    else if (currentCategory === 'distraction') distractionSeconds += currentElapsed
  }

  const scoredSeconds = productiveSeconds + distractionSeconds
  const focusScore = scoredSeconds === 0
    ? aggregate?.focusScore ?? 0
    : Math.min(100, Math.round((productiveSeconds / scoredSeconds) * 100))

  // pomodoro === null also holds the skeleton: rendering before the snapshot
  // arrives would flash the idle view over a running timer, then crossfade.
  if (isLoading || pomodoro === null) {
    // Skeleton matching the final layout's dimensions — no spinner, no shift.
    return (
      <div className="flex min-h-[480px] w-popup flex-col gap-3 bg-canvas px-4 py-4">
        <div className="h-9 rounded-lg bg-surface" />
        <div className="h-[224px] rounded-lg bg-surface" />
        <div className="h-12 rounded-lg bg-surface" />
      </div>
    )
  }

  const dateLocale = language === 'zh-TW' ? 'zh-TW' : 'en-US'

  return (
    <div className="flex min-h-full w-popup flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={iconSrc} alt="" width={22} height={22} className="rounded-md" />
          <span className="text-label font-semibold text-content">EchoFocus</span>
        </div>
        <TrackingToggle isTracking={isTracking} onToggle={toggleTracking} />
      </header>

      <div className="flex flex-col gap-4 px-4 py-3">
        {currentSession?.domain && (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: currentCategory ? DOTS[currentCategory] : 'var(--neutral)' }}
            />
            <span className="flex-shrink-0 text-caption text-content-secondary">{t.popup.now}</span>
            <span className="truncate text-body text-content">{currentSession.domain}</span>
            <span className="ml-auto flex-shrink-0 text-caption text-content-tertiary">
              {Math.floor(currentElapsed / 60)}:{String(currentElapsed % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        <StatusModule
          score={focusScore}
          totalSeconds={totalSeconds}
          pomodoro={pomodoro}
          remainingMs={remainingMs}
          onCommand={command}
        />

        <CategoryColumns
          productiveSeconds={productiveSeconds}
          distractionSeconds={distractionSeconds}
          neutralSeconds={neutralSeconds}
        />

        <PopupWaveform
          hours={aggregate?.productiveByHour ?? Array.from({ length: 24 }, () => 0)}
          label={t.popup.focusByHour}
        />

        <section>
          <h2 className="mb-1 text-label text-content-secondary">{t.popup.todaysSites}</h2>
          <DomainList
            domains={topDomains}
            currentDomain={currentSession?.domain ?? null}
            currentElapsedSeconds={currentElapsed}
          />
        </section>
      </div>

      <footer className="mt-auto flex items-center justify-between border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-caption text-content-tertiary">
            {new Date().toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })}
          </span>
          <button
            onClick={toggleLanguage}
            className="pressable text-caption text-content-tertiary hover:text-content-secondary"
            title={language === 'en' ? '切換至繁體中文' : 'Switch to English'}
          >
            {language === 'en' ? 'EN' : '繁'}
          </button>
          {trackingState?.isIdle && (
            <span className="flex items-center gap-1 text-caption text-content-tertiary">
              <Moon size={12} strokeWidth={1.5} /> {t.popup.idle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/today` })}
            className="pressable text-label text-accent"
          >
            {t.popup.viewFullAnalysis}
          </button>
          <button
            onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/settings` })}
            className="pressable text-content-secondary hover:text-content"
            title={t.popup.openSettings}
          >
            <SettingsIcon size={16} strokeWidth={1.5} />
          </button>
        </div>
      </footer>
    </div>
  )
}
