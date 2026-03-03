import React, { useState } from 'react'
import { useLocale } from '../lib/i18n'

type Step = 0 | 1 | 2 | 3

export default function App() {
  const { t } = useLocale()
  const [step, setStep] = useState<Step>(0)

  const steps = [
    {
      icon: '🎯',
      title: t.onboarding.step0Title,
      subtitle: t.onboarding.step0Subtitle,
      content: (
        <p className="text-slate-400 text-sm leading-relaxed text-center max-w-sm mx-auto">
          {t.onboarding.step0Desc}
        </p>
      ),
      cta: t.onboarding.step0Cta,
    },
    {
      icon: '🔒',
      title: t.onboarding.step1Title,
      subtitle: t.onboarding.step1Subtitle,
      content: (
        <ul className="space-y-3 w-full max-w-sm mx-auto">
          {[t.onboarding.step1Privacy0, t.onboarding.step1Privacy1, t.onboarding.step1Privacy2].map((text, i) => (
            <li key={i} className="flex items-start gap-3 bg-slate-800 rounded-xl px-4 py-3">
              <span className="text-lg flex-shrink-0">{['💾', '💡', '🛡️'][i]}</span>
              <span className="text-sm text-slate-300 leading-relaxed">{text}</span>
            </li>
          ))}
        </ul>
      ),
      cta: t.onboarding.step1Cta,
    },
    {
      icon: '⚡',
      title: t.onboarding.step2Title,
      subtitle: t.onboarding.step2Subtitle,
      content: (
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
          {[
            { icon: '👀', title: t.onboarding.step2Feature0Title, desc: t.onboarding.step2Feature0Desc },
            { icon: '💡', title: t.onboarding.step2Feature1Title, desc: t.onboarding.step2Feature1Desc },
            { icon: '📊', title: t.onboarding.step2Feature2Title, desc: t.onboarding.step2Feature2Desc },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-xs font-semibold text-slate-200 mb-1">{title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      ),
      cta: t.onboarding.step2Cta,
    },
    {
      icon: '🎉',
      title: t.onboarding.step3Title,
      subtitle: t.onboarding.step3Subtitle,
      content: (
        <div className="space-y-3 w-full max-w-sm mx-auto">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <p className="text-sm text-green-400 leading-relaxed text-center">
              {t.onboarding.step3TrackingNote}
            </p>
          </div>
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            {t.onboarding.step3SignInNote}
          </p>
        </div>
      ),
      cta: null,
    },
  ]

  const current = steps[step]

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage()
    chrome.tabs.getCurrent(tab => {
      if (tab?.id !== undefined) chrome.tabs.remove(tab.id)
    })
  }

  const handleClose = () => {
    chrome.tabs.getCurrent(tab => {
      if (tab?.id !== undefined) chrome.tabs.remove(tab.id)
    })
  }

  return (
    <div className="relative min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 py-12">
      {/* Skip link — top-right corner, all steps */}
      <button
        onClick={handleClose}
        className="absolute top-5 right-6 text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        {t.onboarding.skip}
      </button>

      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 h-2 bg-green-500'
                  : i < step
                  ? 'w-2 h-2 bg-green-700'
                  : 'w-2 h-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-center mb-5">
          <span className="text-6xl">{current.icon}</span>
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-slate-100">{current.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{current.subtitle}</p>
        </div>

        {/* Content */}
        <div className="mt-6 mb-8 flex flex-col items-center">
          {current.content}
        </div>

        {/* CTA */}
        {step < 3 ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setStep((step + 1) as Step)}
              className="w-full max-w-sm py-3 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {current.cta}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
            <button
              onClick={handleOpenOptions}
              className="w-full py-3 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {t.onboarding.step3SignIn}
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 text-sm rounded-xl transition-colors"
            >
              {t.onboarding.step3SkipBasic}
            </button>
          </div>
        )}

        {/* Back button */}
        {step > 0 && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setStep((step - 1) as Step)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              {t.onboarding.back}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
