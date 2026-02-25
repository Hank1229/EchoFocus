import React, { useState } from 'react'

type Step = 0 | 1 | 2 | 3

const STEPS = [
  {
    icon: '🎯',
    title: '歡迎使用 EchoFocus',
    subtitle: 'AI 驅動的智慧生產力追蹤工具',
    content: (
      <p className="text-slate-400 text-sm leading-relaxed text-center max-w-sm mx-auto">
        EchoFocus 自動記錄你的瀏覽行為，利用 AI 分析工作模式，
        並提供具體可執行的生產力改善建議 — 幫助你了解時間都花在哪裡。
      </p>
    ),
    cta: '開始了解 →',
  },
  {
    icon: '🔒',
    title: '你的資料，完全由你掌控',
    subtitle: '隱私優先設計',
    content: (
      <ul className="space-y-3 w-full max-w-sm mx-auto">
        {[
          { icon: '💾', text: '所有瀏覽記錄僅儲存於你的裝置，絕不上傳至任何伺服器' },
          { icon: '🤖', text: 'AI 分析只使用匿名數據（網域名稱 + 時長），從不接觸完整 URL' },
          { icon: '🛡️', text: '帳戶資料使用 Supabase 加密儲存，符合隱私標準' },
        ].map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3 bg-slate-800 rounded-xl px-4 py-3">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <span className="text-sm text-slate-300 leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
    ),
    cta: '繼續 →',
  },
  {
    icon: '⚡',
    title: '三步驟提升生產力',
    subtitle: '自動化、智慧化、視覺化',
    content: (
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
        {[
          { icon: '👀', title: '自動追蹤', desc: '靜默記錄每個網站的停留時間，零手動操作' },
          { icon: '🧠', title: 'AI 分析', desc: 'Gemini AI 識別工作模式，給出具體建議' },
          { icon: '📊', title: '視覺報告', desc: '每日 Dashboard 與 Email 報告，一目了然' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-xs font-semibold text-slate-200 mb-1">{title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    ),
    cta: '繼續 →',
  },
  {
    icon: '🎉',
    title: '一切就緒！',
    subtitle: '開始追蹤你的生產力',
    content: (
      <div className="space-y-3 w-full max-w-sm mx-auto">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <p className="text-sm text-green-400 leading-relaxed text-center">
            EchoFocus 已開始在背景自動追蹤。點擊工具列的圖示可隨時查看今日統計。
          </p>
        </div>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          登入帳戶可解鎖網頁 Dashboard、AI 分析、每日 Email 報告等進階功能。
          你也可以先使用基本追蹤功能，之後再連接帳戶。
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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 py-12">
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
            {step === 0 && (
              <button
                onClick={handleClose}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                略過教學，直接使用
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
            <button
              onClick={handleOpenOptions}
              className="w-full py-3 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              登入帳戶，解鎖全部功能
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 text-sm rounded-xl transition-colors"
            >
              稍後再說，先使用基本功能
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
              ← 上一步
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
