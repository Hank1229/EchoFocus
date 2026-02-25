import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EchoFocus — 智慧生產力追蹤',
  description: 'AI 驅動的隱私優先生產力追蹤工具。所有瀏覽資料僅儲存於您的裝置。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="dark">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
