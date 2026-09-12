'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { requestAiAnalysis } from '@/lib/ai'

interface Props {
  analysisText: string | null
  todayDate: string
  language: string
}

export default function DailyInsight({ analysisText, todayDate, language }: Props) {
  const { t } = useLocale()
  const [text, setText] = useState<string | null>(analysisText)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setIsRunning(true)
    setError(null)
    try {
      const outcome = await requestAiAnalysis(todayDate, language)
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
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 px-7 py-7 sm:px-9 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 font-display text-base font-semibold tracking-tight text-slate-100">
          <Sparkles size={15} strokeWidth={1.75} className="text-brand" />
          {t.today.dailyInsight}
        </h2>
        {text && (
          <button
            onClick={run}
            disabled={isRunning}
            className="flex flex-shrink-0 items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={12} strokeWidth={2} className={isRunning ? 'animate-spin' : ''} />
            {isRunning ? t.today.regenerating : t.today.regenerate}
          </button>
        )}
      </div>

      {lead ? (
        <div className="mt-6">
          {/* The lead paragraph is the product's whole point, so it is set as a
              lead: larger, brighter, and held to a reading measure. The
              follow-up runs in two columns so the surface carries the text
              instead of trailing off into empty space. */}
          <p className="max-w-[58ch] text-lg leading-[1.6] text-slate-100">{lead}</p>
          {rest.length > 0 && (
            <div className="mt-6 gap-10 lg:columns-2">
              {rest.map((para, i) => (
                <p
                  key={i}
                  className="mb-4 break-inside-avoid text-[0.9375rem] leading-[1.7] text-slate-400 last:mb-0"
                >
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 max-w-md">
          <p className="text-[0.9375rem] leading-relaxed text-slate-400">{t.today.noInsightYet}</p>
          <button
            onClick={run}
            disabled={isRunning}
            className="mt-5 flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-soft disabled:opacity-60"
          >
            {isRunning ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                {t.today.regenerating}
              </>
            ) : (
              <>
                <Sparkles size={15} strokeWidth={2} />
                {t.today.generateInsight}
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs leading-relaxed text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
