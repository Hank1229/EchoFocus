'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { requestWeeklyAnalysis } from '@/lib/ai'
import { insightLanguage, type InsightLanguage } from '@/lib/insight-language'
import { nextWeeklyReset, resetPhrase } from '@/lib/quota-reset'

interface Props {
  initialText: string | null
  language: string
}

// The weekly retrospective — week-scoped, so it lives at the foot of Trends.
// Same accent-subtle container as Today's daily insight: the one tint that
// marks AI-written text.
export default function WeeklyReview({ initialText, language }: Props) {
  const { t } = useLocale()
  const [text, setText] = useState<string | null>(initialText)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ui: InsightLanguage = language === 'zh-TW' ? 'zh-TW' : 'en'
  const languageName = (lang: InsightLanguage) => (lang === 'zh-TW' ? t.aiInsights.langChinese : t.aiInsights.langEnglish)
  // One weekly generation a week, and the review on screen already used it:
  // a mismatch gets a note on when the next one opens, never a button.
  const textLanguage = text ? insightLanguage(text) : null
  const mismatch = textLanguage !== null && textLanguage !== ui
  const weeklyReset = () => {
    const now = new Date()
    return resetPhrase(nextWeeklyReset(now), now, ui)
  }
  // Worked out after mount: the server renders in UTC, and a time from its
  // clock would not survive hydration.
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null)
  useEffect(() => {
    if (!mismatch) return
    const now = new Date()
    setNextReviewAt(resetPhrase(nextWeeklyReset(now), now, ui))
  }, [mismatch, ui])

  const run = async () => {
    setIsRunning(true)
    setError(null)
    try {
      const outcome = await requestWeeklyAnalysis(language)
      switch (outcome.status) {
        case 'success':
        case 'cached':
          setText(outcome.analysisText)
          break
        case 'error':
          if (outcome.reason === 'not-signed-in') setError(t.aiInsights.pleaseSignIn)
          else if (outcome.reason === 'no-data') setError(t.aiInsights.noSyncedData)
          else if (outcome.reason === 'weekly-quota') setError(t.aiInsights.quotaWeekly.replace('{when}', weeklyReset()))
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
    <section className="rounded-lg bg-accent-subtle px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-label text-content-secondary">
          <Sparkles size={14} strokeWidth={1.5} className="text-accent" />
          {t.aiInsights.generateWeekly}
        </h2>
        {text && !mismatch && (
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
          <p className="text-body text-content-secondary">{t.aiInsights.weeklyDesc}</p>
          <button
            onClick={run}
            disabled={isRunning}
            className="pressable mt-4 rounded-md bg-accent px-4 py-2 text-label text-accent-ink disabled:opacity-60"
          >
            {isRunning ? t.today.regenerating : t.aiInsights.generateWeekly}
          </button>
        </div>
      )}

      {mismatch && textLanguage && (
        <p className="mt-4 text-caption text-content-secondary">
          {t.aiInsights.reviewWrittenIn.replace('{lang}', languageName(textLanguage))}
          {nextReviewAt && (
            <>
              {ui === 'zh-TW' ? '' : ' '}
              {t.aiInsights.reviewNext.replace('{when}', nextReviewAt).replace('{lang}', languageName(ui))}
            </>
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-caption" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </section>
  )
}
