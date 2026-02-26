import Link from 'next/link'
import Image from 'next/image'
import { Lightbulb, BarChart3, Lock, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={32} height={32} className="rounded-lg" />
            <span className="font-bold tracking-wide">
              <span style={{ color: '#E2E8F0' }}>Echo</span><span style={{ color: '#2DD4BF' }}>Focus</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
              Sign In
            </Link>
            <a href="https://chromewebstore.google.com" target="_blank" rel="noreferrer"
              className="text-sm px-4 py-1.5 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-full transition-colors">
              Install Extension →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={48} height={48} className="rounded-xl" />
          <span className="text-3xl font-bold tracking-wide">
            <span style={{ color: '#E2E8F0' }}>Echo</span><span style={{ color: '#2DD4BF' }}>Focus</span>
          </span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-medium mb-6">
          <Lock size={12} strokeWidth={1.75} />
          Privacy-First — browsing data always stays on your device
        </div>
        <h1 className="text-5xl font-bold text-slate-100 leading-tight mb-6">
          Let AI Show You<br />
          <span className="text-green-400">Where Your Time Goes</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          EchoFocus automatically tracks your browsing, analyzes your work patterns,
          and delivers personalized productivity insights — helping you stay more focused every day.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="https://chromewebstore.google.com" target="_blank" rel="noreferrer"
            className="px-8 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-colors text-lg">
            Install Chrome Extension — Free
          </a>
          <Link href="/login"
            className="px-8 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl transition-colors text-lg">
            Open Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              Icon: Lightbulb,
              iconClass: 'text-blue-400',
              title: 'AI Productivity Advisor',
              desc: 'Google Gemini AI analyzes your work patterns and gives specific, actionable improvement tips — like having a personal coach on standby.',
            },
            {
              Icon: BarChart3,
              iconClass: 'text-emerald-400',
              title: 'Visual Data Insights',
              desc: 'Clear charts reveal daily and weekly trends, showing your most focused periods and the sites that distract you most.',
            },
            {
              Icon: Lock,
              iconClass: 'text-slate-300',
              title: 'Your Data, Your Rules',
              desc: 'All browsing history is stored entirely on your device — never uploaded to any server. Even AI analysis uses only anonymized aggregate data.',
            },
          ].map(f => (
            <div key={f.title} className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <div className="mb-4">
                <f.Icon size={28} strokeWidth={1.75} className={f.iconClass} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy banner */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-3">
            <Shield size={28} strokeWidth={1.75} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-3">Privacy Protection Built Into the Architecture — Not Added as an Afterthought</h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unlike RescueTime and Toggl Track, which send browsing data to their servers,
            EchoFocus uses a local-first architecture. Lawyers, doctors, engineers, and anyone
            handling sensitive information can use it with confidence.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>© 2026 EchoFocus</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
