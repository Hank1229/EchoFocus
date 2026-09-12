import Link from 'next/link'
import Image from 'next/image'
import {
  Activity,
  ArrowUpRight,
  Cloud,
  Download,
  Gauge,
  Github,
  HardDrive,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { getLocale } from '@/lib/i18n-server'
import LanguageToggle from '@/components/landing/LanguageToggle'
import ProductPreview from '@/components/landing/ProductPreview'

const RELEASES_URL = 'https://github.com/Hank1229/EchoFocus/releases'
const REPO_URL = 'https://github.com/Hank1229/EchoFocus'

// Mirrors the real request built in apps/extension/src/lib/ai.ts — keep in sync
// if that payload ever changes, since the page presents it as literal truth.
const AI_PAYLOAD = `{
  "date": "2026-09-11",
  "language": "en",
  "aggregate": {
    "date": "2026-09-11",
    "totalMinutes": 406,
    "productiveMinutes": 292,
    "distractionMinutes": 66,
    "neutralMinutes": 48,
    "focusScore": 82,
    "topDomains": [
      { "domain": "github.com",  "minutes": 134, "category": "productive" },
      { "domain": "figma.com",   "minutes": 98,  "category": "productive" },
      { "domain": "youtube.com", "minutes": 41,  "category": "distraction" }
    ]
  }
}`

function Wordmark({ size = 32, className = 'text-sm' }: { size?: number; className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={size} height={size} className="rounded-lg" />
      <span className={`font-bold tracking-wide ${className}`}>
        <span className="text-slate-200">Echo</span><span className="text-brand">Focus</span>
      </span>
    </span>
  )
}

export default async function LandingPage() {
  const { t } = await getLocale()
  const { hero, how, privacy, features, cta, footer, nav, preview } = t.landing

  const steps = [
    { title: how.step1Title, desc: how.step1Desc },
    { title: how.step2Title, desc: how.step2Desc },
    { title: how.step3Title, desc: how.step3Desc },
  ]

  const stays = [privacy.stays1, privacy.stays2, privacy.stays3, privacy.stays4]
  const leaves = [privacy.leaves1, privacy.leaves2, privacy.leaves3, privacy.leaves4]

  const featureCards = [
    { Icon: Activity, title: features.f1Title, desc: features.f1Desc },
    { Icon: Sparkles, title: features.f2Title, desc: features.f2Desc },
    { Icon: Gauge, title: features.f3Title, desc: features.f3Desc },
    { Icon: SlidersHorizontal, title: features.f4Title, desc: features.f4Desc },
    { Icon: TrendingUp, title: features.f5Title, desc: features.f5Desc },
    { Icon: Trash2, title: features.f6Title, desc: features.f6Desc },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            <LanguageToggle />
            <Link href="/login" className="hidden text-sm text-slate-400 transition-colors hover:text-slate-200 sm:block">
              {nav.signIn}
            </Link>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-soft"
            >
              <Github size={14} strokeWidth={2} />
              {nav.download}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800/80">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-16rem] h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[130px]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              <Lock size={12} strokeWidth={2} />
              {hero.badge}
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-100 sm:text-5xl">
              {hero.headline1}
              <br />
              <span className="text-brand">{hero.headline2}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">{hero.sub}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-brand-soft"
              >
                <Download size={18} strokeWidth={2} />
                {hero.download}
              </a>
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-900 hover:text-slate-100"
              >
                {hero.dashboard}
              </Link>
            </div>
            <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-500">{hero.note}</p>
          </div>

          <ProductPreview copy={preview} />
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-800/80">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">{how.eyebrow}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-100">{how.title}</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-sm font-semibold text-brand ring-1 ring-brand/20">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-b border-slate-800/80 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">{privacy.eyebrow}</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-100">
            {privacy.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">{privacy.desc}</p>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-6">
              <div className="flex items-center gap-2.5">
                <HardDrive size={18} strokeWidth={1.75} className="text-brand" />
                <h3 className="font-semibold text-slate-100">{privacy.staysTitle}</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {stays.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Lock size={14} strokeWidth={1.75} className="mt-0.5 flex-shrink-0 text-brand/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center gap-2.5">
                <Cloud size={18} strokeWidth={1.75} className="text-slate-400" />
                <h3 className="font-semibold text-slate-100">{privacy.leavesTitle}</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {leaves.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <ArrowUpRight size={14} strokeWidth={1.75} className="mt-0.5 flex-shrink-0 text-slate-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <figure className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-3">
              <span className="font-mono text-xs text-slate-500">POST /functions/v1/ai-analyze</span>
              <span className="text-xs text-slate-500">{privacy.payloadCaption}</span>
            </figcaption>
            <pre className="overflow-x-auto px-5 py-4 font-mono text-xs leading-relaxed text-slate-400">
              {AI_PAYLOAD}
            </pre>
          </figure>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:flex-row sm:items-center">
            <ShieldCheck size={22} strokeWidth={1.75} className="flex-shrink-0 text-brand" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-100">{privacy.permsTitle}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{privacy.permsDesc}</p>
            </div>
            <Link
              href="/privacy"
              className="flex-shrink-0 text-sm font-medium text-brand transition-colors hover:text-brand-soft"
            >
              {privacy.link} →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-slate-800/80">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-medium uppercase tracking-wider text-brand">{features.eyebrow}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-100">{features.title}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(f => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-slate-700"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
                  <f.Icon size={18} strokeWidth={1.75} className="text-brand" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 px-6 py-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[110px]"
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">{cta.title}</h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-400">{cta.desc}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-brand-soft"
              >
                <Download size={18} strokeWidth={2} />
                {cta.download}
              </a>
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-900 hover:text-slate-100"
              >
                {cta.dashboard}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Wordmark size={24} className="text-xs" />
            <p className="mt-2 text-xs text-slate-600">{footer.tagline}</p>
            <p className="mt-1 text-xs text-slate-600">{footer.copyright}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <Link href="/privacy" className="transition-colors hover:text-slate-300">{t.common.privacyPolicy}</Link>
            <Link href="/terms" className="transition-colors hover:text-slate-300">{t.common.termsOfService}</Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-slate-300">
              {footer.github}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
