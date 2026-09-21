'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import DayWaveform from '@/components/dashboard/DayWaveform'
import ScoreDial from '@/components/dashboard/ScoreDial'

// The guide is a walkthrough again — one idea per page, a picture beside the
// words, and a Next button — because being handed a wall of prose is how a
// reader ends up knowing ABOUT the product without knowing how to work it.

const DEMO_HOURS = [
  0, 0, 0, 0, 0, 0, 0, 420,
  2340, 3120, 2760, 1980, 540, 1260, 2880, 3540,
  3060, 1740, 660, 0, 900, 480, 0, 0,
]

const STEPS = 5

function split(list: string): string[] {
  return list.split(';').map(s => s.trim()).filter(Boolean)
}

export default function GuideWalkthrough() {
  const { t } = useLocale()
  const [step, setStep] = useState(0)
  const [entered, setEntered] = useState(true)

  const go = useCallback((next: number) => {
    if (next < 0 || next >= STEPS) return
    setEntered(false)
    // One frame out, then the new step rises in — the same settle the rest of
    // the dashboard uses, never a hard swap.
    requestAnimationFrame(() => {
      setStep(next)
      requestAnimationFrame(() => setEntered(true))
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(step + 1)
      if (e.key === 'ArrowLeft') go(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, go])

  const localItems = split(t.guide.localItems)
  const cloudItems = split(t.guide.cloudItems)
  const checklist = split(t.guide.setupChecklist)
  const checklistLinks = split(t.guide.checklistLinks)
  const checklistHrefs = [
    '/dashboard/settings?tab=general',
    '/dashboard/settings?tab=categories',
    '/dashboard/settings?tab=account',
  ]

  const pages = [
    // ── 1 · How tracking works ──────────────────────────────────────────────
    <div key="how" className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-center">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-100">{t.guide.howTitle}</h2>
        <p className="mt-4 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-slate-400">{t.guide.howBody}</p>
      </div>
      <div className="surface px-6 py-6">
        <p className="text-xs text-slate-500">{t.guide.demoDay}</p>
        <div className="mt-4">
          <DayWaveform hours={DEMO_HOURS} label={t.today.focusByHour} />
        </div>
      </div>
    </div>,

    // ── 2 · The focus score ─────────────────────────────────────────────────
    <div key="score" className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-center">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-100">{t.guide.scoreTitle}</h2>
        <p className="mt-4 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-slate-400">{t.guide.scoreBody}</p>
        <p className="mt-6 text-sm text-slate-500">{t.guide.formulaReads}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 font-display text-lg text-slate-200">
          <span className="rounded-md bg-productive/10 px-2.5 py-1 text-productive">{t.guide.scoreChipProductive}</span>
          <span className="text-slate-600">÷ (</span>
          <span className="rounded-md bg-productive/10 px-2.5 py-1 text-productive">{t.guide.scoreChipProductive}</span>
          <span className="text-slate-600">+</span>
          <span className="rounded-md bg-breaks/10 px-2.5 py-1 text-breaks">{t.guide.scoreChipBreaks}</span>
          <span className="text-slate-600">)</span>
        </p>
      </div>
      <div className="flex justify-center">
        <ScoreDial score={76} label={t.today.focusScore} />
      </div>
    </div>,

    // ── 3 · Categories & rules ──────────────────────────────────────────────
    <div key="rules" className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-center">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-100">{t.guide.categoriesTitle}</h2>
        <ul className="mt-5 space-y-3">
          {[
            { text: t.guide.categoriesProductive, dot: 'bg-productive' },
            { text: t.guide.categoriesBreaks, dot: 'bg-breaks' },
            { text: t.guide.categoriesNeutral, dot: 'bg-neutral-deep' },
          ].map(({ text, dot }) => (
            <li key={text} className="flex items-baseline gap-3 text-[1.0625rem] text-slate-300">
              <span aria-hidden className={`h-2 w-2 flex-shrink-0 translate-y-[-1px] rounded-full ${dot}`} />
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[58ch] text-[0.9375rem] leading-relaxed text-slate-500">{t.guide.categoriesNote}</p>
        <Link
          href="/dashboard/settings?tab=categories"
          className="mt-5 inline-block text-sm font-medium text-brand transition-colors hover:text-brand-soft"
        >
          {t.guide.linkRules} →
        </Link>
      </div>
      <div className="surface px-6 py-6">
        <p className="text-xs text-slate-500">{t.guide.ruleExampleLabel}</p>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
          <code className="min-w-0 flex-1 truncate text-sm text-slate-200">{t.guide.ruleExamplePattern}</code>
          <span className="flex-shrink-0 rounded-md border border-slate-700 px-2 py-0.5 text-[0.6875rem] text-slate-400">
            {t.guide.ruleExampleMatch}
          </span>
          <span className="flex-shrink-0 rounded-md bg-productive/10 px-2 py-0.5 text-[0.6875rem] font-medium text-productive">
            {t.guide.ruleExampleCategory}
          </span>
        </div>
      </div>
    </div>,

    // ── 4 · Privacy ─────────────────────────────────────────────────────────
    <div key="privacy" className="max-w-none">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-100">{t.guide.privacyTitle}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="surface px-6 py-6">
          <p className="text-sm font-semibold text-slate-200">{t.guide.localColumn}</p>
          <ul className="mt-4 space-y-2.5">
            {localItems.map(item => (
              <li key={item} className="flex items-baseline gap-2.5 text-sm text-slate-400">
                <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 translate-y-[-2px] rounded-full bg-slate-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="surface px-6 py-6">
          <p className="text-sm font-semibold text-brand">{t.guide.cloudColumn}</p>
          <ul className="mt-4 space-y-2.5">
            {cloudItems.map(item => (
              <li key={item} className="flex items-baseline gap-2.5 text-sm text-slate-400">
                <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 translate-y-[-2px] rounded-full bg-brand/70" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-slate-500">{t.guide.whereNote}</p>
    </div>,

    // ── 5 · Get set up ──────────────────────────────────────────────────────
    <div key="setup" className="max-w-none">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-100">{t.guide.whereTitle}</h2>
      <p className="mt-4 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-slate-400">{t.guide.whereSyncNote}</p>
      <ul className="mt-7 space-y-3">
        {checklist.map((item, i) => (
          <li key={item}>
            <Link
              href={checklistHrefs[i] ?? '/dashboard/settings'}
              className="pressable group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4 hover:border-brand/40"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Check size={13} strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1 text-[0.9375rem] text-slate-300 group-hover:text-slate-100">{item}</span>
              <span className="flex-shrink-0 text-xs text-slate-600 group-hover:text-brand">{checklistLinks[i]} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>,
  ]

  return (
    <div>
      {/* Progress: dots you can press, plus the step count for orientation. */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" role="tablist" aria-label={t.guide.title}>
          {Array.from({ length: STEPS }, (_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={t.guide.stepOf.replace('{n}', String(i + 1)).replace('{total}', String(STEPS))}
              onClick={() => go(i)}
              className={`pressable h-2 rounded-full ${
                i === step ? 'w-6 bg-brand' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
              style={{ transition: 'width 300ms var(--ease-silk), background-color 150ms var(--ease-silk)' }}
            />
          ))}
        </div>
        <p className="text-xs tabular-nums text-slate-600">
          {t.guide.stepOf.replace('{n}', String(step + 1)).replace('{total}', String(STEPS))}
        </p>
      </div>

      <div
        className="mt-10 min-h-[22rem]"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'none' : 'translateY(8px)',
          transition: 'opacity 260ms var(--ease-silk), transform 260ms var(--ease-silk)',
        }}
      >
        {pages[step]}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-slate-800/80 pt-6">
        <button
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="pressable flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 disabled:invisible"
        >
          <ArrowLeft size={15} strokeWidth={1.75} /> {t.guide.prev}
        </button>
        {step < STEPS - 1 ? (
          <button
            onClick={() => go(step + 1)}
            className="pressable flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-brand-soft"
          >
            {t.guide.next} <ArrowRight size={15} strokeWidth={2} />
          </button>
        ) : (
          <Link
            href="/dashboard/settings"
            className="pressable flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-brand-soft"
          >
            {t.guide.startSetup} <ArrowRight size={15} strokeWidth={2} />
          </Link>
        )}
      </div>
    </div>
  )
}
