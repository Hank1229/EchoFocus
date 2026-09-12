'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getTodayDateString } from '@echofocus/shared'
import { useLocale } from '@/lib/i18n'
import { requestAiAnalysis } from '@/lib/ai'
import { scoreNumeralClass } from '@/components/dashboard/score'

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
    <div>
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[0.9375rem] leading-relaxed text-slate-400">{t.aiInsights.generateDesc}</p>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              {t.aiInsights.generating}
            </>
          ) : (
            <>
              <Sparkles size={15} strokeWidth={2} />
              {t.aiInsights.generateToday}
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 rounded-xl border border-brand/25 bg-brand/[0.04] px-6 py-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium text-slate-300">{t.aiInsights.todaySnapshot}</p>
            <p className={`font-display text-xl font-semibold tabular-nums ${scoreNumeralClass(result.focusScore)}`}>
              {result.focusScore}
            </p>
          </div>
          <p className="mt-3 max-w-[64ch] text-[0.9375rem] leading-[1.7] text-slate-300">{result.analysisText}</p>
          <p className="mt-3 text-xs text-slate-600">{t.aiInsights.reloadNote}</p>
        </div>
      )}
    </div>
  )
}
