'use client'

import { useLocale } from '@/lib/i18n'

export default function LanguageToggle() {
  const { language, setLanguage } = useLocale()

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
      className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
      title={language === 'en' ? '切換至繁體中文' : 'Switch to English'}
    >
      {language === 'en' ? 'EN | 繁' : '繁 | EN'}
    </button>
  )
}
