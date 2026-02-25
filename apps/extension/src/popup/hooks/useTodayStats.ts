import { useState, useEffect, useCallback } from 'react'
import type { DailyAggregate, TrackingState, Category } from '@echofocus/shared'
import { getTodayDateString } from '@echofocus/shared'

interface CurrentSession {
  domain: string | null
  category: Category | null
  elapsedSeconds: number
}

interface TodayStatsResult {
  aggregate: DailyAggregate | null
  trackingState: TrackingState | null
  currentSession: CurrentSession | null
  isLoading: boolean
  refreshAggregate: () => Promise<void>
  refreshTrackingState: () => Promise<void>
}

async function sendMessage<T>(type: string, payload?: unknown): Promise<T | null> {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload })
    if (response?.success) return response.data as T
    return null
  } catch {
    // Service worker may not be running yet
    return null
  }
}

export function useTodayStats(): TodayStatsResult {
  const [aggregate, setAggregate] = useState<DailyAggregate | null>(null)
  const [trackingState, setTrackingState] = useState<TrackingState | null>(null)
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadAggregate = useCallback(async () => {
    const today = getTodayDateString()
    const key = `aggregates:${today}`
    const result = await chrome.storage.local.get(key)
    const agg = result[key] as DailyAggregate | undefined
    setAggregate(agg ?? null)
  }, [])

  const loadTrackingState = useCallback(async () => {
    const state = await sendMessage<TrackingState>('GET_TRACKING_STATE')
    setTrackingState(state)
  }, [])

  const loadCurrentSession = useCallback(async () => {
    const session = await sendMessage<CurrentSession>('GET_CURRENT_SESSION')
    setCurrentSession(session)
  }, [])

  const refreshAggregate = useCallback(async () => {
    await loadAggregate()
  }, [loadAggregate])

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await Promise.all([loadAggregate(), loadTrackingState(), loadCurrentSession()])
      setIsLoading(false)
    }
    void init()
  }, [loadAggregate, loadTrackingState, loadCurrentSession])

  // Poll current session every second for live timer
  useEffect(() => {
    const interval = setInterval(() => {
      void loadCurrentSession()
    }, 1000)
    return () => clearInterval(interval)
  }, [loadCurrentSession])

  // Listen for storage changes to refresh aggregate
  useEffect(() => {
    const today = getTodayDateString()
    const aggregateKey = `aggregates:${today}`

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (aggregateKey in changes) {
        setAggregate(changes[aggregateKey].newValue as DailyAggregate ?? null)
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  return { aggregate, trackingState, currentSession, isLoading, refreshAggregate, refreshTrackingState: loadTrackingState }
}
