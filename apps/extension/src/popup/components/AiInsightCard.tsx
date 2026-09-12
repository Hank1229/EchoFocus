import React, { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import type { AiAnalysisResult } from '@echofocus/shared'
import { useLocale } from '../../lib/i18n'

interface AiInsightCardProps {
  analysis: AiAnalysisResult | null
  isAnalyzing: boolean
  error: string | null
  canAnalyze: boolean
  onAnalyze: () => void
}

const PREVIEW_LENGTH = 170

export default function AiInsightCard({ analysis, isAnalyzing, error, canAnalyze, onAnalyze }: AiInsightCardProps) {
  const { t, language } = useLocale()
  const [expanded, setExpanded] = useState(false)

  const text = analysis?.analysisText ?? ''
  const isLong = text.length > PREVIEW_LENGTH
  const shownText = expanded || !isLong ? text : `${text.slice(0, PREVIEW_LENGTH).trimEnd()}…`

  const analyzedAt = analysis
    ? new Date(analysis.analyzedAt).toLocaleTimeString(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/10 via-slate-900 to-slate-900 p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />

      <header className="flex items-center gap-2">
        <Sparkles size={15} strokeWidth={2} className="text-brand" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-brand-soft">
          {t.aiInsight.dailyInsight}
        </h2>
        {analyzedAt && !isAnalyzing && (
          <span className="ml-auto text-[11px] text-slate-500">{t.aiInsight.analyzed} {analyzedAt}</span>
        )}
      </header>

      {isAnalyzing ? (
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-xs text-slate-400">{t.aiInsight.generating}</p>
        </div>
      ) : error ? (
        <div className="mt-3">
          <p className="text-xs leading-relaxed text-danger">{error}</p>
          <button
            onClick={onAnalyze}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-brand-soft"
          >
            <RefreshCw size={14} strokeWidth={2.25} />
            {t.aiInsight.retry}
          </button>
        </div>
      ) : analysis ? (
        <div className="mt-2.5">
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-200">{shownText}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            {isLong ? (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs font-medium text-brand transition-colors hover:text-brand-soft"
              >
                {expanded ? t.aiInsight.collapse : t.aiInsight.readMore}
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={onAnalyze}
              disabled={!canAnalyze}
              className="flex items-center gap-1.5 rounded-lg border border-brand/30 px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500 disabled:hover:bg-transparent"
              title={canAnalyze ? t.aiInsight.refresh : t.popup.needAtLeast30Min}
            >
              <RefreshCw size={13} strokeWidth={2.25} />
              {t.aiInsight.refresh}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5">
          <p className="text-xs leading-relaxed text-slate-400">
            {canAnalyze ? t.popup.generateSnapshot : t.popup.needAtLeast30Min}
          </p>
          <button
            onClick={onAnalyze}
            disabled={!canAnalyze}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            <Sparkles size={14} strokeWidth={2.25} />
            {t.aiInsight.generate}
          </button>
        </div>
      )}
    </section>
  )
}
