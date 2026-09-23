'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
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

// The insight half of Today's review. The accent-subtle container is the
// product's one "AI wrote this" marker — the same tint the interface uses
// for nothing else inside a card.
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
    <div className="rounded-lg bg-accent-subtle px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-label text-content-secondary">
          <Sparkles size={14} strokeWidth={1.5} className="text-accent" />
          {t.today.dailyInsight}
        </h3>
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
        <div className="mt-3">
          <p className="text-body text-content">{lead}</p>
          {rest.map((para, i) => (
            <p key={i} className="mt-3 text-body text-content-secondary">
              {para}
            </p>
          ))}
        </div>
      ) : (
        <div className="mt-3">
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
