import React, { useCallback, useEffect, useState } from 'react'
import { LogIn, Moon, Settings as SettingsIcon } from 'lucide-react'
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
import { isSignInPending } from '../lib/signin-flag'

const LANGUAGES: { value: Language; short: string; name: string }[] = [
  { value: 'en', short: 'EN', name: 'English' },
  { value: 'zh-TW', short: '繁', name: '繁體中文' },
]

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

  // Sign-in entry, shown only while signed out, directly under the header:
  // the popup outgrows Chrome's 600px cap, so anything lower needs a scroll.
  // Clicking it hands the OAuth flow to the worker — this popup closes when
  // the auth window opens, so the linking state is read back on reopen.
  // null = not read yet, so the nudge never flashes before storage answers.
  const [signedOut, setSignedOut] = useState<boolean | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  useEffect(() => {
    void chrome.storage.local.get(['supabase_session', 'signin_in_progress']).then(stored => {
      setSignedOut(stored.supabase_session === undefined)
      setIsLinking(isSignInPending(stored.signin_in_progress))
    })
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('supabase_session' in changes) setSignedOut(changes.supabase_session.newValue === undefined)
      if ('signin_in_progress' in changes) setIsLinking(isSignInPending(changes.signin_in_progress.newValue))
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  // While the popup sits open, poll the cheap cloud prefs (theme, pomodoro
  // durations) so a dashboard save lands within a tick — the popup has no
  // push channel from the website.
  useEffect(() => {
    if (signedOut !== false) return
    const interval = setInterval(() => {
      void sendMessage('REFRESH_CLOUD_PREFS')
    }, 2500)
    return () => clearInterval(interval)
  }, [signedOut])

  const toggleTracking = useCallback(async () => {
    await sendMessage('TOGGLE_TRACKING')
    await Promise.all([refreshAggregate(), refreshTrackingState()])
  }, [refreshAggregate, refreshTrackingState])

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
        {signedOut === true && (
          // Outline, not solid: the idle module's "Start focus" is the one
          // filled accent button, and two would fight for the same glance.
          <button
            onClick={() => { setIsLinking(true); void sendMessage('SIGN_IN') }}
            disabled={isLinking}
            className="pressable flex w-full items-center justify-center gap-2 rounded-md border border-accent bg-surface px-3 py-2 text-label text-accent hover:bg-surface-hover disabled:cursor-default disabled:opacity-60"
          >
            <LogIn size={14} strokeWidth={1.5} aria-hidden="true" />
            {isLinking ? t.popup.connecting : t.popup.signInHint}
          </button>
        )}

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
          <div role="group" aria-label={t.general.language} className="flex items-center rounded-full border border-line p-0.5">
            {LANGUAGES.map(({ value, short, name }) => (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                aria-pressed={language === value}
                title={name}
                className={`pressable rounded-full px-2 py-0.5 text-caption ${
                  language === value
                    ? 'bg-accent-subtle text-accent'
                    : 'text-content-secondary hover:bg-surface-hover hover:text-content'
                }`}
              >
                {short}
              </button>
            ))}
          </div>
          {trackingState?.isIdle && (
            <span className="flex items-center gap-1 text-caption text-content-tertiary">
              <Moon size={12} strokeWidth={1.5} /> {t.popup.idle}
            </span>
          )}
        </div>
        <div className="-mr-1.5 flex items-center gap-1">
          <button
            onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/today` })}
            className="pressable rounded-md px-2 py-1 text-label text-accent hover:bg-surface-hover"
          >
            {t.popup.viewFullAnalysis}
          </button>
          {/* Settings live on the dashboard; its footer links the few that
              stay extension-only. */}
          <button
            onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/settings` })}
            className="pressable rounded-md p-1.5 text-content-secondary hover:bg-surface-hover hover:text-content"
            title={t.popup.openSettings}
          >
            <SettingsIcon size={16} strokeWidth={1.5} />
          </button>
        </div>
      </footer>
    </div>
  )
}
