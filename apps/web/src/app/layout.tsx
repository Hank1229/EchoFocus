import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import '@fontsource-variable/bricolage-grotesque'
import './globals.css'
import { LanguageProvider, type Language } from '@/lib/i18n'
import { ThemeProvider, type ThemePreference } from '@/lib/theme'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'EchoFocus — Privacy-First Productivity Tracker',
  description: 'AI-powered productivity tracker. All browsing data stays on your device — never uploaded to any server.',
  icons: { icon: '/favicon.ico' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('echofocus-lang')?.value ?? 'en') as Language

  // 'system' stamps nothing: the CSS media query alone separates light from
  // dark and keeps following live OS changes.
  const themeCookie = cookieStore.get('echofocus-theme')?.value
  const theme: ThemePreference = themeCookie === 'light' || themeCookie === 'dark' ? themeCookie : 'system'

  return (
    <html lang={lang === 'zh-TW' ? 'zh-TW' : 'en'} {...(theme !== 'system' ? { 'data-theme': theme } : {})}>
      <body className="min-h-screen bg-canvas text-content antialiased" suppressHydrationWarning>
        <ThemeProvider initialTheme={theme}>
          <LanguageProvider initialLanguage={lang}>
            {children}
          </LanguageProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
