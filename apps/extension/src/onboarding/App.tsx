import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import iconSrc from '../assets/icon-48.png'
import { useLocale } from '../lib/i18n'
import WelcomeStep from './components/WelcomeStep'
import TrackingStep from './components/TrackingStep'
import PrivacyStep from './components/PrivacyStep'
import ReadyStep from './components/ReadyStep'

const LAST_STEP = 3

function closeOnboardingTab() {
  chrome.tabs.getCurrent(tab => {
    if (tab?.id !== undefined) chrome.tabs.remove(tab.id)
  })
}

export default function App() {
  const { t, language, setLanguage } = useLocale()
  const [step, setStep] = useState(0)
  const [entered, setEntered] = useState(false)

  // Replay the fade-in on every step change instead of animating with a library.
  useEffect(() => {
    setEntered(false)
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [step])

  const labels = [
    t.onboarding.step0Label,
    t.onboarding.step1Label,
    t.onboarding.step2Label,
    t.onboarding.step3Label,
  ]
  const ctas = [t.onboarding.step0Cta, t.onboarding.step1Cta, t.onboarding.step2Cta]

  const openSettings = () => {
    chrome.runtime.openOptionsPage()
    closeOnboardingTab()
  }

  const isLast = step === LAST_STEP

  return (
    <div className="min-h-screen bg-canvas text-content">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-8 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={iconSrc} alt="" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-bold leading-none tracking-tight">
              <span className="text-content">Echo</span><span className="text-accent">Focus</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
              className="text-xs font-medium text-content-tertiary transition-colors hover:text-accent"
              title={language === 'en' ? '切換至繁體中文' : 'Switch to English'}
            >
              {language === 'en' ? 'EN' : '繁'}
            </button>
            <button
              onClick={closeOnboardingTab}
              className="text-xs text-content-tertiary transition-colors hover:text-content-secondary"
            >
              {t.onboarding.skip}
            </button>
          </div>
        </header>

        <nav className="mt-9 flex gap-2.5">
          {labels.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              disabled={i > step}
              className="flex flex-1 flex-col gap-2 text-left disabled:cursor-default"
            >
              <span
                className={`h-[3px] rounded-full transition-colors duration-500 ${
                  i <= step ? 'bg-accent' : 'bg-surface'
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors duration-500 ${
                  i === step ? 'text-accent' : i < step ? 'text-content-secondary' : 'text-content-tertiary'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>

        <main
          className={`flex flex-1 items-center py-14 transition-all duration-500 ease-out ${
            entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <div className="w-full">
            {step === 0 && <WelcomeStep />}
            {step === 1 && <TrackingStep />}
            {step === 2 && <PrivacyStep />}
            {step === 3 && <ReadyStep />}
          </div>
        </main>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <button
            onClick={() => setStep(step - 1)}
            className={`flex items-center gap-1.5 text-xs text-content-tertiary transition-colors hover:text-content-secondary ${
              step === 0 ? 'invisible' : ''
            }`}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t.onboarding.back}
          </button>

          <div className="flex items-center gap-3">
            {isLast && (
              <button
                onClick={closeOnboardingTab}
                className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:border-line-strong hover:text-content"
              >
                {t.onboarding.step3SkipBasic}
              </button>
            )}
            <button
              onClick={isLast ? openSettings : () => setStep(step + 1)}
              className="pressable rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
            >
              {isLast ? t.onboarding.step3SignIn : ctas[step]}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
