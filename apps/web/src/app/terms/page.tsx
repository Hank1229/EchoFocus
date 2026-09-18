import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'Terms of Service — EchoFocus',
  description: 'EchoFocus Terms of Service: please read these terms before using our productivity tracking tool.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold tracking-tight text-slate-100">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default async function TermsPage() {
  const { t } = await getLocale()

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-100 hover:text-white transition-colors">
            <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={28} height={28} className="rounded-lg" />
            <span className="font-display text-base font-semibold tracking-tight">
              <span className="text-slate-200">Echo</span><span className="text-brand">Focus</span>
            </span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            {t.terms.backToHome}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-slate-100">{t.common.termsOfService}</h1>
          <p className="text-sm text-slate-500">{t.terms.lastUpdated} {t.common.legalLastUpdated}</p>
        </div>

        <div className="bg-slate-800 rounded-xl px-5 py-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {t.terms.intro}
          </p>
        </div>

        <Section title={t.terms.section1Title}>
          <p>{t.terms.s1Body}</p>
        </Section>

        <Section title={t.terms.section2Title}>
          <p>{t.terms.s2Intro}</p>
          <ul className="space-y-1 list-disc list-inside">
            {t.terms.s2Items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title={t.terms.section3Title}>
          <p>{t.terms.s3Body}</p>
        </Section>

        <Section title={t.terms.section4Title}>
          <p>{t.terms.s4Intro}</p>
          <ul className="space-y-1 list-disc list-inside">
            {t.terms.s4Items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title={t.terms.section5Title}>
          <p>
            {t.terms.s5Body}{' '}
            {t.terms.s5SeeLead}
            <Link href="/privacy" className="text-brand hover:text-brand-soft underline underline-offset-2">{t.common.privacyPolicy}</Link>
            {t.terms.s5SeeTail}
          </p>
        </Section>

        <Section title={t.terms.section6Title}>
          <p>{t.terms.s6Body}</p>
        </Section>

        <Section title={t.terms.section7Title}>
          <p>{t.terms.s7Body}</p>
        </Section>

        <Section title={t.terms.section8Title}>
          <p>{t.terms.s8Body}</p>
        </Section>

        <Section title={t.terms.section9Title}>
          <p>{t.terms.s9Body1}</p>
          <p>{t.terms.s9Body2}</p>
        </Section>

        <Section title={t.terms.section10Title}>
          <p>{t.terms.s10Body}</p>
        </Section>

        <Section title={t.terms.section11Title}>
          <p>{t.terms.s11Body}</p>
        </Section>

        <Section title={t.terms.section12Title}>
          <p>{t.terms.s12Body}</p>
        </Section>

        {/* Footer links */}
        <div className="border-t border-slate-800 pt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">{t.common.home}</Link>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">{t.common.privacyPolicy}</Link>
        </div>
      </main>
    </div>
  )
}
