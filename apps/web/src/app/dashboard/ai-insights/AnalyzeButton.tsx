'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lightbulb, MessageCircle } from 'lucide-react'
import { getTodayDateString } from '@echofocus/shared'
import { useLocale } from '@/lib/i18n'
import { requestAiAnalysis } from '@/lib/ai'

interface AnalysisResult {
  analysisText: string
  focusScore: number
}

export default function AnalyzeButton() {
  const router = useRouter()
  const { t, language } = useLocale()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Local date — the extension syncs by local day, so a UTC date would
      // miss the row for most of the evening
      const outcome = await requestAiAnalysis(getTodayDateString(), language)

      switch (outcome.status) {
        case 'success':
          setResult({ analysisText: outcome.analysisText, focusScore: outcome.focusScore })
          router.refresh()  // Reload server data so history list shows new entry
          break
        case 'cached':
          setResult({ analysisText: outcome.analysisText, focusScore: outcome.focusScore })
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
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t.aiInsights.generating}
          </>
        ) : (
          <>
            <Lightbulb size={18} strokeWidth={1.75} />
            {t.aiInsights.generateToday}
          </>
        )}
      </button>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-r-lg border-l-2 border-brand bg-slate-800 p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MessageCircle size={16} strokeWidth={1.75} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-400">{t.aiInsights.todaySnapshot}</span>
            </div>
            <span className="ml-auto text-sm font-semibold tabular-nums text-brand">{result.focusScore} {t.aiInsights.pts}</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{result.analysisText}</p>
          <p className="mt-3 text-xs text-slate-600">{t.aiInsights.reloadNote}</p>
        </div>
      )}
    </div>
  )
}
