import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EchoFocus — Privacy-First Productivity Tracker',
  description: 'AI-powered productivity tracker. All browsing data stays on your device — never uploaded to any server.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
