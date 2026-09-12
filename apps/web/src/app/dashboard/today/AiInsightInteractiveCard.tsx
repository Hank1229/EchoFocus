'use client'

import { useState } from 'react'
import { TrendingUp, Search, CheckCircle, Sparkles } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { requestAiAnalysis } from '@/lib/ai'

const PARAGRAPH_ICONS = [TrendingUp, Search, CheckCircle, Sparkles]

interface Props {
  analysisText: string | null
  todayDate: string
  language: string
}

export default function AiInsightInteractiveCard({ analysisText, todayDate, language }: Props) {
  const { t } = useLocale()
  const [localText, setLocalText] = useState<string | null>(analysisText)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setError(null)
    try {
      const outcome = await requestAiAnalysis(todayDate, language)

      switch (outcome.status) {
        case 'success':
        case 'cached':
          setLocalText(outcome.analysisText)
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
      setIsRegenerating(false)
    }
  }

  const paragraphs = (localText ?? '').split(/\n\n+/).filter(Boolean).slice(0, 4)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">{t.today.dailyInsight}</p>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          {isRegenerating ? (
            <>
              <span className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
              {t.today.regenerating}
            </>
          ) : (
            t.today.regenerate
          )}
        </button>
      </div>

      <div className="flex-1">
        {localText && paragraphs.length > 0 ? (
          <ul className="space-y-3">
            {paragraphs.map((para, i) => {
              const Icon = PARAGRAPH_ICONS[i] ?? Sparkles
              return (
                <li key={i} className="flex gap-2">
                  <Icon size={14} strokeWidth={1.75} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300 leading-relaxed">{para}</p>
                </li>
              )
            })}
          </ul>
        ) : isRegenerating ? (
          <p className="text-sm text-slate-500">{t.today.regenerating}</p>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-slate-500">{t.today.noInsightYet}</p>
            <button
              onClick={handleRegenerate}
              className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              {t.today.generateInsight}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
