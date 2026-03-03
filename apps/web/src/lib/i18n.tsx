'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
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

export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: {
  children: ReactNode
  initialLanguage?: Language
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const router = useRouter()

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('echofocus-lang', lang)
      document.cookie = `echofocus-lang=${lang}; path=/; max-age=31536000; SameSite=Lax`
    }
    router.refresh()
  }, [router])

  return (
    <LanguageContext.Provider value={{ t: LOCALES[language], language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLocale() {
  return useContext(LanguageContext)
}
