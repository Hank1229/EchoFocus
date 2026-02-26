import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — EchoFocus',
  description: 'EchoFocus Terms of Service: please read these terms before using our productivity tracking tool.',
}

const LAST_UPDATED = 'January 1, 2025'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-100 hover:text-white transition-colors">
            <span className="text-xl">🎯</span>
            <span className="font-bold">EchoFocus</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-100">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="bg-slate-800 rounded-xl px-5 py-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Thank you for using EchoFocus. Please read these terms carefully before use. Installing and using EchoFocus constitutes your agreement to these terms.
          </p>
        </div>

        <Section title="1. Description of Service">
          <p>
            EchoFocus is a Chrome browser extension that provides automatic browsing behavior tracking, AI productivity analysis,
            a visual dashboard, and daily email reports — designed to help you improve your personal productivity.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>To use EchoFocus you must:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Be at least 13 years old (or the minimum age required in your jurisdiction)</li>
            <li>Use Chrome 116 or later</li>
            <li>Agree to these terms and our Privacy Policy</li>
          </ul>
        </Section>

        <Section title="3. Account & Authentication">
          <p>
            Basic tracking features work without an account. To access the dashboard, AI analysis, and email reports,
            you must sign in with a Google account. You are responsible for maintaining the security of your account
            and all activity that occurs under it.
          </p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Attempt to reverse-engineer or circumvent any part of EchoFocus</li>
            <li>Use EchoFocus to track other people without their consent</li>
            <li>Use EchoFocus in any way that could harm the service or other users</li>
            <li>Bypass or interfere with EchoFocus's security features</li>
          </ul>
        </Section>

        <Section title="5. Data & Privacy">
          <p>
            Your browsing data belongs to you. EchoFocus uses a local-first design —
            raw browsing records are always stored only on your device.
            See our <Link href="/privacy" className="text-green-400 hover:text-green-300 underline underline-offset-2">Privacy Policy</Link> for full details.
          </p>
        </Section>

        <Section title="6. Disclaimer of Warranties">
          <p>
            EchoFocus is provided "as is" without any express or implied warranties.
            We do not guarantee that the service will be uninterrupted, error-free, or meet your specific requirements.
            Productivity improvements vary by individual and cannot be guaranteed.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, the developers of EchoFocus shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use or inability to use the service,
            even if advised of the possibility of such damages.
          </p>
        </Section>

        <Section title="8. Third-Party Services">
          <p>
            EchoFocus uses Supabase, Google Gemini API, and Resend. Use of these services is subject to their respective terms.
            EchoFocus is not responsible for the availability or content of third-party services.
          </p>
        </Section>

        <Section title="9. Changes & Termination">
          <p>
            We reserve the right to modify, suspend, or terminate EchoFocus (or any part of it) at any time without notice.
            We are not liable for any modification, suspension, or termination of the service.
          </p>
          <p>
            You may terminate your use of EchoFocus at any time by removing the extension from Chrome and deleting your account.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may revise these terms from time to time. Significant changes will be communicated through the extension or by email.
            Continued use of EchoFocus after notification constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These terms are governed by and construed in accordance with applicable law, without regard to conflict of law principles.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            For any questions about these terms, please reach out via GitHub Issues.
          </p>
        </Section>

        {/* Footer links */}
        <div className="border-t border-slate-800 pt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
        </div>
      </main>
    </div>
  )
}
