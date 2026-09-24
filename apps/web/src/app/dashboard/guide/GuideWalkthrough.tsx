'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import DayWaveform from '@/components/dashboard/DayWaveform'
import SiteRanking from '../today/SiteRanking'
import GuideTimerDemo from './GuideTimerDemo'
import ScoreDial from '@/components/dashboard/ScoreDial'

// The guide is a walkthrough again — one idea per page, a picture beside the
// words, and a Next button — because being handed a wall of prose is how a
// reader ends up knowing ABOUT the product without knowing how to work it.

const DEMO_SITES = [
  { domain: 'github.com', seconds: 9240, category: 'productive' as const },
  { domain: 'youtube.com', seconds: 3420, category: 'distraction' as const },
  { domain: 'docs.google.com', seconds: 2760, category: 'productive' as const },
  { domain: 'gmail.com', seconds: 1560, category: 'neutral' as const },
]

const DEMO_HOURS = [
  0, 0, 0, 0, 0, 0, 0, 420,
  2340, 3120, 2760, 1980, 540, 1260, 2880, 3540,
  3060, 1740, 660, 0, 900, 480, 0, 0,
]

const STEPS = 6

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
        <h2 className="text-title text-content">{t.guide.howTitle}</h2>
        <p className="mt-4 max-w-[58ch] text-body text-content-secondary">{t.guide.howBody}</p>
      </div>
      <div className="rounded-lg border border-line bg-surface px-6 py-6">
        <p className="text-caption text-content-tertiary">{t.guide.demoDay}</p>
        <div className="mt-4">
          <DayWaveform hours={DEMO_HOURS} label={t.today.focusByHour} />
        </div>
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-caption text-content-tertiary">{t.guide.demoSites}</p>
          <div className="mt-2">
            <SiteRanking heading="" sites={DEMO_SITES} emptyLabel={t.today.noData} />
          </div>
        </div>
      </div>
    </div>,

    // ── 2 · The focus score ─────────────────────────────────────────────────
    <div key="score" className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-center">
      <div>
        <h2 className="text-title text-content">{t.guide.scoreTitle}</h2>
        <p className="mt-4 max-w-[58ch] text-body text-content-secondary">{t.guide.scoreBody}</p>
        <p className="mt-6 text-caption text-content-tertiary">{t.guide.formulaReads}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-body text-content">
          <span className="rounded px-2.5 py-1" style={{ background: 'color-mix(in srgb, var(--productive) 10%, transparent)', color: 'var(--productive)' }}>{t.guide.scoreChipProductive}</span>
          <span className="text-content-tertiary">÷ (</span>
          <span className="rounded px-2.5 py-1" style={{ background: 'color-mix(in srgb, var(--productive) 10%, transparent)', color: 'var(--productive)' }}>{t.guide.scoreChipProductive}</span>
          <span className="text-content-tertiary">+</span>
          <span className="rounded px-2.5 py-1" style={{ background: 'color-mix(in srgb, var(--rest) 10%, transparent)', color: 'var(--rest)' }}>{t.guide.scoreChipBreaks}</span>
          <span className="text-content-tertiary">)</span>
        </p>
      </div>
      <div className="flex justify-center">
        <ScoreDial score={76} label={t.today.focusScore} />
      </div>
    </div>,

    // ── 3 · The focus timer — the real component, hands-on ──────────────────
    <div key="timer" className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-center">
      <div>
        <h2 className="text-title text-content">{t.guide.timerTitle}</h2>
        <p className="mt-4 max-w-[58ch] text-body text-content-secondary">{t.guide.timerBody}</p>
      </div>
      <GuideTimerDemo />
    </div>,

    // ── 4 · Categories & rules ──────────────────────────────────────────────
    <div key="rules" className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-center">
      <div>
        <h2 className="text-title text-content">{t.guide.categoriesTitle}</h2>
        <ul className="mt-5 space-y-3">
          {[
            { text: t.guide.categoriesProductive, dot: 'var(--productive)' },
            { text: t.guide.categoriesBreaks, dot: 'var(--rest)' },
            { text: t.guide.categoriesNeutral, dot: 'var(--neutral)' },
          ].map(({ text, dot }) => (
            <li key={text} className="flex items-baseline gap-3 text-body text-content">
              <span aria-hidden className="h-2 w-2 flex-shrink-0 translate-y-[-1px] rounded-full" style={{ background: dot }} />
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[58ch] text-caption text-content-tertiary">{t.guide.categoriesNote}</p>
        <Link
          href="/dashboard/settings?tab=categories"
          className="pressable mt-5 inline-flex items-center gap-1.5 text-label text-accent"
        >
          {t.guide.linkRules} <ArrowRight size={13} strokeWidth={1.5} />
        </Link>
      </div>
      <div className="rounded-lg border border-line bg-surface px-6 py-6">
        <p className="text-caption text-content-tertiary">{t.guide.ruleExampleLabel}</p>
        <div className="mt-4 flex items-center gap-3 rounded-md border border-line bg-canvas px-4 py-3">
          <code className="min-w-0 flex-1 truncate text-body text-content">{t.guide.ruleExamplePattern}</code>
          <span className="flex-shrink-0 rounded border border-line-strong px-2 py-0.5 text-caption text-content-secondary">
            {t.guide.ruleExampleMatch}
          </span>
          <span className="flex-shrink-0 rounded px-2 py-0.5 text-caption font-medium" style={{ background: 'color-mix(in srgb, var(--productive) 10%, transparent)', color: 'var(--productive)' }}>
            {t.guide.ruleExampleCategory}
          </span>
        </div>
      </div>
    </div>,

    // ── 4 · Privacy ─────────────────────────────────────────────────────────
    <div key="privacy" className="max-w-none">
      <h2 className="text-title text-content">{t.guide.privacyTitle}</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface px-6 py-6">
          <p className="text-label text-content">{t.guide.localColumn}</p>
          <ul className="mt-4 space-y-2.5">
            {localItems.map(item => (
              <li key={item} className="flex items-baseline gap-2.5 text-body text-content-secondary">
                <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 translate-y-[-2px] rounded-full" style={{ background: 'var(--text-tertiary)' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-surface px-6 py-6">
          <p className="text-label text-accent">{t.guide.cloudColumn}</p>
          <ul className="mt-4 space-y-2.5">
            {cloudItems.map(item => (
              <li key={item} className="flex items-baseline gap-2.5 text-body text-content-secondary">
                <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 translate-y-[-2px] rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-5 max-w-[62ch] text-caption text-content-tertiary">{t.guide.whereNote}</p>
    </div>,

    // ── 5 · Get set up ──────────────────────────────────────────────────────
    <div key="setup" className="max-w-none">
      <h2 className="text-title text-content">{t.guide.whereTitle}</h2>
      <p className="mt-4 max-w-[58ch] text-body text-content-secondary">{t.guide.whereSyncNote}</p>
      <ul className="mt-7 space-y-3">
        {checklist.map((item, i) => (
          <li key={item}>
            <Link
              href={checklistHrefs[i] ?? '/dashboard/settings'}
              className="pressable group flex items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4 hover:border-accent"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
                <Check size={13} strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1 text-body text-content group-hover:text-content">{item}</span>
              <span className="flex flex-shrink-0 items-center gap-1 text-caption text-content-tertiary group-hover:text-accent">{checklistLinks[i]} <ArrowRight size={12} strokeWidth={1.5} /></span>
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
                i === step ? 'w-6 bg-accent' : 'w-2 bg-line-strong hover:bg-content-tertiary'
              }`}
              style={{ transition: 'width var(--dur-base) var(--ease), background-color var(--dur-base) var(--ease)' }}
            />
          ))}
        </div>
        <p className="text-caption text-content-tertiary">
          {t.guide.stepOf.replace('{n}', String(step + 1)).replace('{total}', String(STEPS))}
        </p>
      </div>

      <div
        className="mt-10 min-h-[22rem]"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'none' : 'translateY(8px)',
          transition: 'opacity var(--dur-slow) var(--ease), transform var(--dur-slow) var(--ease)',
        }}
      >
        {pages[step]}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
        <button
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="pressable flex items-center gap-2 rounded-md px-4 py-2.5 text-label text-content-secondary hover:text-content disabled:invisible"
        >
          <ArrowLeft size={15} strokeWidth={1.5} /> {t.guide.prev}
        </button>
        {step < STEPS - 1 ? (
          <button
            onClick={() => go(step + 1)}
            className="pressable flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-label text-accent-ink"
          >
            {t.guide.next} <ArrowRight size={15} strokeWidth={1.5} />
          </button>
        ) : (
          <Link
            href="/dashboard/settings"
            className="pressable flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-label text-accent-ink"
          >
            {t.guide.startSetup} <ArrowRight size={15} strokeWidth={1.5} />
          </Link>
        )}
      </div>
    </div>
  )
}
