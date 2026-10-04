import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import iconSrc from '../assets/icon-48.png'
import { useLocale } from '../lib/i18n'
import { sendMessage } from '../lib/messaging'
import { isSignInPending } from '../lib/signin-flag'
import { accountEmail } from '../lib/account-email'
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

  // The last step signs in through the worker, the same one-click flow as the
  // popup. Unlike the popup this tab stays open while the Google window runs,
  // so it watches storage: a session appearing means done; the flag clearing
  // with no session means the flow ended unfinished (closed, failed, or
  // refused because another sign-in window is still open).
  const [signedIn, setSignedIn] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [incomplete, setIncomplete] = useState(false)
  useEffect(() => {
    void chrome.storage.local.get(['supabase_session', 'signin_in_progress']).then(stored => {
      setSignedIn(stored.supabase_session !== undefined)
      setEmail(accountEmail(stored.supabase_session))
      setIsLinking(isSignInPending(stored.signin_in_progress))
    })
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ('supabase_session' in changes) {
        const raw = changes.supabase_session.newValue
        setSignedIn(raw !== undefined)
        setEmail(accountEmail(raw))
      }
      if ('signin_in_progress' in changes) {
        const pending = isSignInPending(changes.signin_in_progress.newValue)
        setIsLinking(pending)
        if (pending) setIncomplete(false)
        else void chrome.storage.local.get('supabase_session').then(s => setIncomplete(s.supabase_session === undefined))
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const signIn = async () => {
    setIsLinking(true)
    setIncomplete(false)
    // null = the worker never got the message, so no flow started.
    if (await sendMessage('SIGN_IN') === null) {
      setIsLinking(false)
      setIncomplete(true)
    }
  }

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

  const isLast = step === LAST_STEP
  const primary = !isLast
    ? { label: ctas[step], onClick: () => setStep(step + 1) }
    : signedIn
      ? { label: t.onboarding.step3Close, onClick: closeOnboardingTab }
      : { label: isLinking ? t.onboarding.step3Connecting : t.onboarding.step3SignIn, onClick: () => void signIn() }

  return (
    <div className="min-h-screen bg-canvas text-content">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-8 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={iconSrc} alt="" width={28} height={28} className="rounded-lg" />
            <span className="text-label font-semibold leading-none tracking-tight">EchoFocus</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
              className="text-label text-content-tertiary transition-colors hover:text-accent"
              title={language === 'en' ? '切換至繁體中文' : 'Switch to English'}
            >
              {language === 'en' ? 'EN' : '繁'}
            </button>
            <button
              onClick={closeOnboardingTab}
              className="text-label text-content-tertiary transition-colors hover:text-content-secondary"
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
                className={`h-[3px] rounded-full [transition:background-color_var(--dur-base)_var(--ease)] ${
                  i <= step ? 'bg-accent' : 'bg-surface'
                }`}
              />
              <span
                className={`text-label [transition:color_var(--dur-base)_var(--ease)] ${
                  i === step ? 'text-accent' : i < step ? 'text-content-secondary' : 'text-content-tertiary'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>

        <main
          className={`flex flex-1 items-center py-14 [transition:opacity_var(--dur-base)_var(--ease)] ${
            entered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-full">
            {step === 0 && <WelcomeStep />}
            {step === 1 && <TrackingStep />}
            {step === 2 && <PrivacyStep />}
            {step === 3 && <ReadyStep signedIn={signedIn} email={email} />}
          </div>
        </main>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          {isLast && !signedIn && incomplete && (
            <p role="alert" className="w-full text-caption text-danger">{t.onboarding.step3Incomplete}</p>
          )}
          <button
            onClick={() => setStep(step - 1)}
            className={`flex items-center gap-1.5 text-label text-content-tertiary transition-colors hover:text-content-secondary ${
              step === 0 ? 'invisible' : ''
            }`}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {t.onboarding.back}
          </button>

          <div className="flex items-center gap-3">
            {isLast && !signedIn && (
              <button
                onClick={closeOnboardingTab}
                className="rounded-md border border-line px-4 py-2.5 text-label text-content-secondary transition-colors hover:border-line-strong hover:text-content"
              >
                {t.onboarding.step3SkipBasic}
              </button>
            )}
            <button
              onClick={primary.onClick}
              disabled={isLast && !signedIn && isLinking}
              className="pressable rounded-md bg-accent px-5 py-2.5 text-label text-accent-ink disabled:cursor-default disabled:opacity-60"
            >
              {primary.label}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
