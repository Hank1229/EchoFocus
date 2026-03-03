import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import en from '../locales/en.json'
import zhTW from '../locales/zh-TW.json'

export type Language = 'en' | 'zh-TW'
export type Locale = typeof en

const LOCALES: Record<Language, Locale> = {
  en,
  'zh-TW': zhTW as typeof en,
}

interface LanguageContextValue {
  t: Locale
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  t: en,
  language: 'en',
  setLanguage: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    chrome.storage.local.get(['language'], (result) => {
      const lang = result.language as Language
      if (lang === 'en' || lang === 'zh-TW') {
        setLanguageState(lang)
      }
    })
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    chrome.storage.local.set({ language: lang })
  }, [])

  return (
    <LanguageContext.Provider value={{ t: LOCALES[language], language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLocale() {
  return useContext(LanguageContext)
}
