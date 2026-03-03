import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import { LanguageProvider, type Language } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'EchoFocus — Privacy-First Productivity Tracker',
  description: 'AI-powered productivity tracker. All browsing data stays on your device — never uploaded to any server.',
  icons: { icon: '/favicon.ico' },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('echofocus-lang')?.value ?? 'en') as Language

  return (
    <html lang={lang === 'zh-TW' ? 'zh-TW' : 'en'} className="dark">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased" suppressHydrationWarning>
        <LanguageProvider initialLanguage={lang}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
