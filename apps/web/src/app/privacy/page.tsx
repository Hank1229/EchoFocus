import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'Privacy Policy — EchoFocus',
  description: 'EchoFocus Privacy Policy: learn how we protect your browsing data and personal information.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold tracking-tight text-slate-100">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default async function PrivacyPage() {
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
            {t.privacy.backToHome}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-slate-100">{t.common.privacyPolicy}</h1>
          <p className="text-sm text-slate-500">{t.privacy.lastUpdated} {t.common.legalLastUpdated}</p>
        </div>

        <div className="rounded-xl border-l-2 border-brand bg-brand/[0.06] px-5 py-4">
          <p className="text-sm text-brand leading-relaxed">
            <strong className="font-semibold">{t.privacy.coreCommitmentLabel}</strong>{' '}
            {t.privacy.coreCommitment}
          </p>
        </div>

        <Section title={t.privacy.section1Title}>
          <p>{t.privacy.intro}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 pr-4 text-slate-300 font-semibold">{t.privacy.tableHeadType}</th>
                  <th className="text-left py-2 pr-4 text-slate-300 font-semibold">{t.privacy.tableHeadWhere}</th>
                  <th className="text-left py-2 text-slate-300 font-semibold">{t.privacy.tableHeadUploaded}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {t.privacy.tableRows.map(([type, location, uploaded]) => (
                  <tr key={type}>
                    <td className="py-2.5 pr-4 text-slate-300">{type}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{location}</td>
                    <td className="py-2.5 text-slate-400">{uploaded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={t.privacy.section2Title}>
          <ul className="space-y-2 list-disc list-inside">
            {t.privacy.section2Items.map((item) => (
              <li key={item.label}><strong className="text-slate-300">{item.label}</strong> {item.text}</li>
            ))}
          </ul>
        </Section>

        <Section title={t.privacy.section3Title}>
          <p>{t.privacy.section3Intro}</p>
          <ul className="space-y-2 list-disc list-inside">
            {t.privacy.section3Items.map((item) => (
              <li key={item.label}><strong className="text-slate-300">{item.label}</strong> {item.text}</li>
            ))}
          </ul>
        </Section>

        <Section title={t.privacy.section4Title}>
          <ul className="space-y-2 list-disc list-inside">
            {t.privacy.section4Items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title={t.privacy.section5Title}>
          <p>{t.privacy.section5Intro}</p>
          <ul className="space-y-2 list-disc list-inside">
            {t.privacy.section5Items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title={t.privacy.section6Title}>
          <p>{t.privacy.section6Body}</p>
        </Section>

        <Section title={t.privacy.section7Title}>
          <p>{t.privacy.section7Body}</p>
        </Section>

        <Section title={t.privacy.section8Title}>
          <p>{t.privacy.section8Body}</p>
        </Section>

        <Section title={t.privacy.section9Title}>
          <p>{t.privacy.section9Body}</p>
        </Section>

        {/* Footer links */}
        <div className="border-t border-slate-800 pt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">{t.common.home}</Link>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">{t.common.termsOfService}</Link>
        </div>
      </main>
    </div>
  )
}
