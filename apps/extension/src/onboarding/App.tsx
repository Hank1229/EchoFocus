import React, { useState } from 'react'

type Step = 0 | 1 | 2 | 3

const STEPS = [
  {
    icon: '🎯',
    title: 'Welcome to EchoFocus',
    subtitle: 'AI-Powered Smart Productivity Tracker',
    content: (
      <p className="text-slate-400 text-sm leading-relaxed text-center max-w-sm mx-auto">
        EchoFocus automatically records your browsing, analyzes work patterns with AI,
        and delivers actionable productivity tips — so you always know where your time goes.
      </p>
    ),
    cta: 'Get Started →',
  },
  {
    icon: '🔒',
    title: 'Your Data, Fully Under Your Control',
    subtitle: 'Privacy-First Design',
    content: (
      <ul className="space-y-3 w-full max-w-sm mx-auto">
        {[
          { icon: '💾', text: 'All browsing data stays on your device — never uploaded to any server' },
          { icon: '💡', text: 'AI analysis uses only anonymous data (domain + duration) — never full URLs' },
          { icon: '🛡️', text: 'Account data is securely encrypted with Supabase' },
        ].map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3 bg-slate-800 rounded-xl px-4 py-3">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <span className="text-sm text-slate-300 leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
    ),
    cta: 'Continue →',
  },
  {
    icon: '⚡',
    title: '3 Steps to Better Productivity',
    subtitle: 'Automated. Intelligent. Visual.',
    content: (
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
        {[
          { icon: '👀', title: 'Auto Track', desc: 'Silently logs time on every site — zero manual input' },
          { icon: '💡', title: 'Daily Snapshot', desc: 'Gemini AI identifies your patterns and gives specific tips' },
          { icon: '📊', title: 'Visual Reports', desc: 'Daily dashboard & email reports at a glance' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-xs font-semibold text-slate-200 mb-1">{title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    ),
    cta: 'Continue →',
  },
  {
    icon: '🎉',
    title: "You're All Set!",
    subtitle: 'Start Tracking Your Productivity',
    content: (
      <div className="space-y-3 w-full max-w-sm mx-auto">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-green-400 leading-relaxed text-center">
            EchoFocus is now tracking in the background. Click the toolbar icon anytime to view today's stats.
          </p>
        </div>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Sign in to unlock the web dashboard, daily snapshots, and email reports.
          You can also start with basic tracking and connect your account later.
        </p>
      </div>
    ),
    cta: null, // handled by final step buttons
  },
] as const

export default function App() {
  const [step, setStep] = useState<Step>(0)

  const current = STEPS[step]

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
        Skip
      </button>

      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((_, i) => (
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
              Sign In to Unlock All Features
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 text-sm rounded-xl transition-colors"
            >
              Skip for now, use basic features
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
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
