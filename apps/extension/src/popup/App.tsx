import React, { useCallback, useEffect, useState } from 'react'
import { Moon, Settings as SettingsIcon, User } from 'lucide-react'
import iconSrc from '../assets/icon-32.png'
import { useTodayStats } from './hooks/useTodayStats'
import { useStreak } from './hooks/useStreak'
import FocusScoreRing from './components/FocusScoreRing'
import { CategoryRows, StatsSummary } from './components/StatsBar'
import StreakChip from './components/StreakChip'
import DomainList from './components/DomainList'
import TrackingToggle from './components/TrackingToggle'
import AiInsightCard from './components/AiInsightCard'
import PopupWaveform from './components/PopupWaveform'
import type { AiAnalysisResult } from '@echofocus/shared'
import { getTodayDateString } from '@echofocus/shared'
import { useLocale, type Language } from '../lib/i18n'
import { DASHBOARD_URL } from '../lib/config'
import { sendMessage } from '../lib/messaging'

// Gemini needs a meaningful sample before an insight is worth generating.
const MIN_ANALYZE_SECONDS = 1800

export default function App() {
  const { t, language, setLanguage } = useLocale()
  const { aggregate, trackingState, currentSession, isLoading, refreshAggregate, refreshTrackingState } = useTodayStats()
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const today = getTodayDateString()

  useEffect(() => {
    void sendMessage<AiAnalysisResult | null>('GET_AI_ANALYSIS', today).then(response => {
      if (response?.data) setAiAnalysis(response.data)
    })
  }, [today])

  const toggleTracking = useCallback(async () => {
    await sendMessage('TOGGLE_TRACKING')
    await Promise.all([refreshAggregate(), refreshTrackingState()])
  }, [refreshAggregate, refreshTrackingState])

  const analyze = useCallback(async () => {
    if (isAnalyzing) return
    setIsAnalyzing(true)
    setAiError(null)
    const response = await sendMessage<AiAnalysisResult>('REQUEST_AI_ANALYSIS', { date: today, language })
    if (response?.success && response.data) {
      setAiAnalysis(response.data)
    } else {
      const reasons: Record<string, string> = {
        'signed-out': t.popup.aiSignedOut,
        'session-expired': t.popup.aiSessionExpired,
        'no-data': t.popup.aiNoData,
      }
      setAiError(reasons[response?.error ?? ''] ?? t.popup.aiError)
    }
    setIsAnalyzing(false)
  }, [isAnalyzing, today, language, t.popup])

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh-TW' : 'en' as Language)
  }

  const isTracking = trackingState?.isTracking ?? false
  const neutralSeconds = aggregate?.neutralSeconds ?? 0
  const uncategorizedSeconds = aggregate?.uncategorizedSeconds ?? 0
  const topDomains = aggregate?.topDomains ?? []

  // The current session is not yet in the stored aggregate — fold it in so the popup reads live.
  const currentCategory = currentSession?.category ?? null
  const currentElapsed = currentSession?.elapsedSeconds ?? 0

  let productiveSeconds = aggregate?.productiveSeconds ?? 0
  let distractionSeconds = aggregate?.distractionSeconds ?? 0
  let totalSeconds = aggregate?.totalSeconds ?? 0

  if (currentCategory && currentElapsed > 0) {
    totalSeconds += currentElapsed
    if (currentCategory === 'productive') productiveSeconds += currentElapsed
    else if (currentCategory === 'distraction') distractionSeconds += currentElapsed
  }

  const scoredSeconds = productiveSeconds + distractionSeconds
  const focusScore = scoredSeconds === 0
    ? aggregate?.focusScore ?? 0
    : Math.min(100, Math.round((productiveSeconds / scoredSeconds) * 100))

  const streak = useStreak(productiveSeconds)

  if (isLoading) {
    return (
      <div className="flex h-48 w-popup items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs text-slate-500">{t.popup.loading}</p>
        </div>
      </div>
    )
  }

  const dateLocale = language === 'zh-TW' ? 'zh-TW' : 'en-US'

  return (
    <div className="flex min-h-full w-popup flex-col bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={iconSrc} alt="" width={24} height={24} className="rounded-md" />
          <span className="font-display text-[15px] font-bold leading-none tracking-tight">
            <span className="text-slate-200">Echo</span><span className="text-brand">Focus</span>
          </span>
        </div>
        <TrackingToggle isTracking={isTracking} onToggle={toggleTracking} />
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {currentSession?.domain && (
          <div className="rise rise-1 flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2">
            <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-brand" />
            <span className="truncate text-xs text-slate-400">
              {t.popup.now} <span className="font-medium text-slate-200">{currentSession.domain}</span>
            </span>
            <span className="ml-auto flex-shrink-0 text-xs tabular-nums text-slate-500">
              {Math.floor(currentElapsed / 60)}:{String(currentElapsed % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        <section
          className="rise rise-1 rounded-2xl border border-slate-800 bg-slate-800/30 p-4"
          style={{ boxShadow: 'inset 0 1px 0 rgba(236, 243, 239, 0.04)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <FocusScoreRing score={focusScore} />
            </div>
            <div className="min-w-0 flex-1">
              <StatsSummary
                productiveSeconds={productiveSeconds}
                distractionSeconds={distractionSeconds}
                neutralSeconds={neutralSeconds}
                uncategorizedSeconds={uncategorizedSeconds}
                totalSeconds={totalSeconds}
              />
            </div>
          </div>

          {aggregate?.productiveByHour && (
            <div className="mt-4 border-t border-slate-800 pt-3">
              <PopupWaveform hours={aggregate.productiveByHour} label={t.popup.focusByHour} />
            </div>
          )}

          <div className="mt-4 border-t border-slate-800 pt-3">
            <CategoryRows
              productiveSeconds={productiveSeconds}
              distractionSeconds={distractionSeconds}
              neutralSeconds={neutralSeconds}
              uncategorizedSeconds={uncategorizedSeconds}
            />
          </div>
        </section>

        {streak && <div className="rise rise-2"><StreakChip current={streak.current} best={streak.best} /></div>}

        <div className="rise rise-3"><AiInsightCard
          analysis={aiAnalysis}
          isAnalyzing={isAnalyzing}
          error={aiError}
          canAnalyze={totalSeconds >= MIN_ANALYZE_SECONDS}
          onAnalyze={analyze}
        /></div>

        <section className="rise rise-4">
          <h2 className="mb-2 text-xs font-medium text-slate-400">{t.popup.todaysSites}</h2>
          <DomainList
            domains={topDomains}
            currentDomain={currentSession?.domain ?? null}
            currentElapsedSeconds={currentElapsed}
          />
        </section>
      </div>

      <footer className="mt-auto flex items-center justify-between border-t border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">
            {new Date().toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })}
          </span>
          <button
            onClick={toggleLanguage}
            className="pressable text-xs font-medium text-slate-500 hover:text-brand"
            title={language === 'en' ? '切換至繁體中文' : 'Switch to English'}
          >
            {language === 'en' ? 'EN' : '繁'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {trackingState?.isIdle && (
            <span className="flex items-center gap-1 text-xs text-slate-600">
              <Moon size={12} strokeWidth={1.75} /> {t.popup.idle}
            </span>
          )}
          <button
            onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/settings?tab=account` })}
            className="pressable text-slate-500 hover:text-brand"
            title={t.popup.openProfile}
          >
            <User size={17} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard/settings` })}
            className="pressable text-slate-500 hover:text-brand"
            title={t.popup.openSettings}
          >
            <SettingsIcon size={17} strokeWidth={1.75} />
          </button>
        </div>
      </footer>
    </div>
  )
}
