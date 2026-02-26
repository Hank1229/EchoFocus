import React, { useCallback, useEffect, useState } from 'react'
import { Lightbulb, Settings as SettingsIcon } from 'lucide-react'
import { useTodayStats } from './hooks/useTodayStats'
import FocusScoreRing from './components/FocusScoreRing'
import StatsBar from './components/StatsBar'
import DomainList from './components/DomainList'
import TrackingToggle from './components/TrackingToggle'
import AiInsightCard from './components/AiInsightCard'
import type { AiAnalysisResult } from '@echofocus/shared'
import { getTodayDateString } from '@echofocus/shared'

interface MessageResponse<T> {
  success: boolean
  data?: T
  error?: string
}

async function sendMessage<T>(type: string, payload?: unknown): Promise<T | null> {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload })
    if (response?.success) return response.data as T
    return null
  } catch {
    return null
  }
}

async function sendMessageRaw<T>(type: string, payload?: unknown): Promise<MessageResponse<T>> {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload }) as MessageResponse<T>
    return response ?? { success: false, error: 'No response' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export default function App() {
  const { aggregate, trackingState, currentSession, isLoading, refreshAggregate, refreshTrackingState } = useTodayStats()
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const today = getTodayDateString()

  // Load cached AI analysis on mount
  useEffect(() => {
    sendMessage<AiAnalysisResult | null>('GET_AI_ANALYSIS', today).then(result => {
      if (result) setAiAnalysis(result)
    })
  }, [today])

  const handleToggleTracking = useCallback(async () => {
    await sendMessage('TOGGLE_TRACKING')
    await Promise.all([refreshAggregate(), refreshTrackingState()])
  }, [refreshAggregate, refreshTrackingState])

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing) return
    setIsAnalyzing(true)
    setAiError(null)
    const res = await sendMessageRaw<AiAnalysisResult>('REQUEST_AI_ANALYSIS', today)
    if (res.success && res.data) {
      setAiAnalysis(res.data)
    } else {
      setAiError(res.error ?? "Couldn't generate your snapshot — check your internet connection and try again")
    }
    setIsAnalyzing(false)
  }, [isAnalyzing, today])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  const isTracking = trackingState?.isTracking ?? false
  const focusScore = aggregate?.focusScore ?? 0
  const productiveSeconds = aggregate?.productiveSeconds ?? 0
  const distractionSeconds = aggregate?.distractionSeconds ?? 0
  const neutralSeconds = aggregate?.neutralSeconds ?? 0
  const uncategorizedSeconds = aggregate?.uncategorizedSeconds ?? 0
  const totalSeconds = aggregate?.totalSeconds ?? 0
  const topDomains = aggregate?.topDomains ?? []

  // Add current session time to appropriate category
  const currentCategory = currentSession?.category ?? null
  const currentElapsed = currentSession?.elapsedSeconds ?? 0

  let displayProductiveSeconds = productiveSeconds
  let displayDistractionSeconds = distractionSeconds
  let displayTotalSeconds = totalSeconds

  if (currentCategory && currentElapsed > 0) {
    displayTotalSeconds += currentElapsed
    if (currentCategory === 'productive') displayProductiveSeconds += currentElapsed
    else if (currentCategory === 'distraction') displayDistractionSeconds += currentElapsed
  }

  // Recompute focus score with live session included
  const liveTotal = displayProductiveSeconds + displayDistractionSeconds
  const liveFocusScore = liveTotal === 0
    ? focusScore
    : Math.min(100, Math.round((displayProductiveSeconds / liveTotal) * 100))

  return (
    <div className="flex flex-col bg-slate-900 min-h-full" style={{ width: 360 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-bold text-slate-100 tracking-wide">EchoFocus</span>
        </div>
        <TrackingToggle
          isTracking={isTracking}
          onToggle={handleToggleTracking}
        />
      </div>

      {/* Focus score ring */}
      <div className="flex justify-center pt-5 pb-4">
        <FocusScoreRing score={liveFocusScore} size={120} />
      </div>

      {/* Current site indicator */}
      {currentSession?.domain && (
        <div className="mx-4 mb-3 px-3 py-2 bg-slate-800 rounded-lg flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <span className="text-xs text-slate-400 truncate">
            Now: <span className="text-slate-200 font-medium">{currentSession.domain}</span>
          </span>
          <span className="ml-auto text-xs text-slate-500 tabular-nums flex-shrink-0">
            {Math.floor(currentElapsed / 60)}:{String(currentElapsed % 60).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Stats breakdown */}
      <div className="px-4 mb-3">
        <StatsBar
          productiveSeconds={displayProductiveSeconds}
          distractionSeconds={displayDistractionSeconds}
          neutralSeconds={neutralSeconds}
          uncategorizedSeconds={uncategorizedSeconds}
          totalSeconds={displayTotalSeconds}
        />
      </div>

      {/* Top domains */}
      <div className="px-4 mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Today's Sites
        </h2>
        <DomainList
          domains={topDomains}
          currentDomain={currentSession?.domain ?? null}
          currentElapsedSeconds={currentElapsed}
        />
      </div>

      {/* AI insight card / error */}
      {(aiAnalysis || isAnalyzing || aiError) && (
        <div className="px-4 mb-3">
          {aiError && !isAnalyzing ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="text-xs text-red-400">{aiError}</p>
            </div>
          ) : (
            <AiInsightCard
              analysisText={aiAnalysis?.analysisText ?? ''}
              analyzedAt={aiAnalysis?.analyzedAt ?? 0}
              isLoading={isAnalyzing}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-slate-800 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-slate-600">
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600">
            {trackingState?.isIdle ? '🌙 Idle' : ''}
          </span>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (aggregate?.totalSeconds ?? 0) === 0}
            className="text-slate-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Generate your daily snapshot"
          >
            <Lightbulb size={18} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => chrome.runtime.openOptionsPage?.()}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            title="Open settings"
          >
            <SettingsIcon size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  )
}
