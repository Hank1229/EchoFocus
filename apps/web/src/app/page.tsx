import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Cloud, Download, Github, HardDrive, Lock, ShieldCheck } from 'lucide-react'
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

function Wordmark({ size = 32, className = 'text-base' }: { size?: number; className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={size} height={size} className="rounded-lg" />
      <span className={`font-display font-semibold tracking-tight ${className}`}>
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

  const featureList = [
    { title: features.f1Title, desc: features.f1Desc },
    { title: features.f2Title, desc: features.f2Desc },
    { title: features.f3Title, desc: features.f3Desc },
    { title: features.f4Title, desc: features.f4Desc },
    { title: features.f5Title, desc: features.f5Desc },
    { title: features.f6Title, desc: features.f6Desc },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Wordmark size={28} className="text-base" />
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
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-soft"
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
          className="pointer-events-none absolute left-1/2 top-[-18rem] h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[140px]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Lock size={13} strokeWidth={2} className="flex-shrink-0 text-slate-500" />
              {hero.badge}
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-slate-100 sm:text-[2.75rem]">
              {hero.headline1}
              <br />
              {hero.headline2}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-400">{hero.sub}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-brand-soft"
              >
                <Download size={18} strokeWidth={2} />
                {hero.download}
              </a>
              <Link
                href="/login"
                className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
              >
                {hero.dashboard}
              </Link>
            </div>
            <p className="mt-5 max-w-md text-xs leading-relaxed text-slate-500">{hero.note}</p>
          </div>

          <ProductPreview copy={preview} />
        </div>
      </section>

      {/* How it works — a threaded sequence, not three boxes */}
      <section className="border-b border-slate-800/80">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-slate-100 sm:text-4xl">
            {how.title}
          </h2>
          <ol className="mt-14 grid gap-x-12 gap-y-12 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="relative border-t border-slate-700/70 pt-8">
                <span className="absolute -top-2.5 left-0 bg-slate-950 pr-3 font-display text-sm font-semibold tabular-nums leading-none text-slate-500">
                  {i + 1}
                </span>
                <h3 className="font-display text-lg font-semibold tracking-tight text-slate-100">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-b border-slate-800/80 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-slate-100 sm:text-4xl">
            {privacy.title}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400">{privacy.desc}</p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 lg:grid-cols-2">
            <div className="bg-slate-950 p-6">
              <div className="flex items-center gap-2.5">
                <HardDrive size={17} strokeWidth={1.75} className="text-slate-400" />
                <h3 className="font-semibold text-slate-100">{privacy.staysTitle}</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {stays.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Lock size={13} strokeWidth={1.75} className="mt-1 flex-shrink-0 text-slate-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 p-6">
              <div className="flex items-center gap-2.5">
                <Cloud size={17} strokeWidth={1.75} className="text-slate-400" />
                <h3 className="font-semibold text-slate-100">{privacy.leavesTitle}</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {leaves.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <ArrowUpRight size={13} strokeWidth={1.75} className="mt-1 flex-shrink-0 text-slate-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <figure className="mt-5 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-3">
              <span className="font-mono text-xs text-slate-500">POST /functions/v1/ai-analyze</span>
              <span className="text-xs text-slate-500">{privacy.payloadCaption}</span>
            </figcaption>
            <pre className="overflow-x-auto px-5 py-4 font-mono text-xs leading-relaxed text-slate-400">
              {AI_PAYLOAD}
            </pre>
          </figure>

          <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-6 sm:flex-row sm:items-center">
            <ShieldCheck size={20} strokeWidth={1.75} className="flex-shrink-0 text-slate-400" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-100">{privacy.permsTitle}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{privacy.permsDesc}</p>
            </div>
            <Link
              href="/privacy"
              className="flex-shrink-0 text-sm font-medium text-brand transition-colors hover:text-brand-soft"
            >
              {privacy.link}
            </Link>
          </div>
        </div>
      </section>

      {/* Features — a list, so it is set as a list */}
      <section className="border-b border-slate-800/80">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-slate-100 sm:text-4xl">
            {features.title}
          </h2>
          <dl className="mt-12 border-t border-slate-800">
            {featureList.map(f => (
              <div
                key={f.title}
                className="grid gap-2 border-b border-slate-800 py-7 md:grid-cols-[15rem_1fr] md:gap-12"
              >
                <dt className="font-display text-lg font-semibold tracking-tight text-slate-100">{f.title}</dt>
                <dd className="max-w-2xl text-sm leading-relaxed text-slate-400">{f.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-balance font-display text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">{cta.title}</h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-400">{cta.desc}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-brand-soft"
            >
              <Download size={18} strokeWidth={2} />
              {cta.download}
            </a>
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
            >
              {cta.dashboard}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Wordmark size={22} className="text-sm" />
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
