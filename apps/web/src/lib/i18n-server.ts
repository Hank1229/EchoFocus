import { cookies } from 'next/headers'
import en from '../locales/en.json'
import zhTW from '../locales/zh-TW.json'

export type Language = 'en' | 'zh-TW'
export type Locale = typeof en

const LOCALES: Record<Language, Locale> = {
  en,
  'zh-TW': zhTW as typeof en,
}

export async function getLocale(): Promise<{ t: Locale; language: Language }> {
  const cookieStore = await cookies()
  const lang = cookieStore.get('echofocus-lang')?.value as Language
  const language: Language = lang === 'zh-TW' ? 'zh-TW' : 'en'
  return { t: LOCALES[language], language }
}
