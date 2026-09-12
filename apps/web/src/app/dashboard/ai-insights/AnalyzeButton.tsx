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
        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-800 border-l-4 border-green-500 rounded-r-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <MessageCircle size={18} strokeWidth={1.75} className="text-blue-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">{t.aiInsights.todaySnapshot}</span>
            </div>
            <span className="ml-auto text-sm font-bold text-green-400">{result.focusScore} {t.aiInsights.pts}</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{result.analysisText}</p>
          <p className="text-xs text-slate-600 mt-3">{t.aiInsights.reloadNote}</p>
        </div>
      )}
    </div>
  )
}
