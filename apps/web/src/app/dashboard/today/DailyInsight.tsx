'use client'

import { useState } from 'react'
import { useLocale } from '@/lib/i18n'
import { requestAiAnalysis } from '@/lib/ai'

interface Props {
  analysisText: string | null
  date: string
  // False for days the ai-analyze function will not accept any more, so the
  // page explains the limit instead of offering a button that 400s.
  canGenerate: boolean
  language: string
}

// The insight half of the Today's review block. Headless on purpose — the
// parent card owns the surface.
export default function DailyInsight({ analysisText, date, canGenerate, language }: Props) {
  const { t } = useLocale()
  const [text, setText] = useState<string | null>(analysisText)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setIsRunning(true)
    setError(null)
    try {
      const outcome = await requestAiAnalysis(date, language)
      switch (outcome.status) {
        case 'success':
        case 'cached':
          setText(outcome.analysisText)
          break
        case 'error':
          if (outcome.reason === 'not-signed-in') setError(t.aiInsights.pleaseSignIn)
          else if (outcome.reason === 'no-data') setError(t.aiInsights.noSyncedData)
          else setError(`${t.aiInsights.analysisFailed}${outcome.message ?? t.aiInsights.unknownError}`)
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.aiInsights.unknownError)
    } finally {
      setIsRunning(false)
    }
  }

  const paragraphs = (text ?? '').split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  const [lead, ...rest] = paragraphs

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-label text-content-secondary">{t.today.dailyInsight}</h3>
        {text && canGenerate && (
          <button
            onClick={run}
            disabled={isRunning}
            className="pressable flex-shrink-0 text-caption text-content-tertiary hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? t.today.regenerating : t.today.regenerate}
          </button>
        )}
      </div>

      {lead ? (
        <div className="mt-4 max-w-[65ch]">
          <p className="text-body text-content">{lead}</p>
          {rest.map((para, i) => (
            <p key={i} className="mt-3 text-body text-content-secondary">
              {para}
            </p>
          ))}
        </div>
      ) : (
        <div className="mt-4 max-w-[65ch]">
          <p className="text-body text-content-secondary">
            {canGenerate ? t.today.noInsightYet : t.today.insightWindowClosed}
          </p>
          {canGenerate && (
            <button
              onClick={run}
              disabled={isRunning}
              className="pressable mt-4 rounded-md bg-accent px-4 py-2 text-label text-accent-ink disabled:opacity-60"
            >
              {isRunning ? t.today.regenerating : t.today.generateInsight}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-caption" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
