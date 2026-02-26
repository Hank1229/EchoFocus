import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — EchoFocus',
  description: 'EchoFocus Privacy Policy: learn how we protect your browsing data and personal information.',
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

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-slate-100">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4">
          <p className="text-sm text-green-400 leading-relaxed">
            <strong className="font-semibold">Core Commitment:</strong>{' '}
            Your browsing history is your private data. EchoFocus uses a local-first architecture — all raw browsing data (URLs, page titles, time spent) is stored exclusively on your device and is never uploaded to any server.
          </p>
        </div>

        <Section title="1. What Data We Collect">
          <p>EchoFocus manages data at two levels:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 pr-4 text-slate-300 font-semibold">Data Type</th>
                  <th className="text-left py-2 pr-4 text-slate-300 font-semibold">Stored Where</th>
                  <th className="text-left py-2 text-slate-300 font-semibold">Uploaded to Server?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  ['Browsing URLs & page titles', 'Your device (chrome.storage.local)', '❌ Never'],
                  ['Time spent per site', 'Your device (chrome.storage.local)', '❌ Never'],
                  ['Site category results', 'Your device (chrome.storage.local)', '❌ Never'],
                  ['Daily aggregate stats (domain + duration only)', 'Your device; optional cloud sync', '⚠️ Anonymous aggregates only (opt-in)'],
                  ['AI analysis results', 'chrome.storage.local + Supabase', '✅ Analysis text only — no raw browsing data'],
                  ['Account info (email, preferences)', 'Supabase (encrypted)', '✅ Used for authentication & reports'],
                ].map(([type, location, uploaded]) => (
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

        <Section title="2. How We Use Your Data">
          <ul className="space-y-2 list-disc list-inside">
            <li><strong className="text-slate-300">Productivity tracking:</strong> Browsing behavior is analyzed locally on your device to generate daily stats and a focus score.</li>
            <li><strong className="text-slate-300">AI analysis:</strong> Anonymous aggregate summaries (domain names + durations, no URLs) are sent to the Google Gemini API for personalized suggestions.</li>
            <li><strong className="text-slate-300">Email reports:</strong> Daily productivity reports are sent via Resend (you can disable this at any time).</li>
            <li><strong className="text-slate-300">Cross-device sync:</strong> Supabase is used to sync your preferences if you choose to enable it.</li>
          </ul>
        </Section>

        <Section title="3. Third-Party Services">
          <p>EchoFocus uses the following third-party services, each with their own privacy policies:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong className="text-slate-300">Supabase:</strong> Used for user authentication, preferences, and AI analysis storage. Data is encrypted and stored on AWS servers.</li>
            <li><strong className="text-slate-300">Google Gemini API:</strong> Used for AI productivity analysis. Receives only anonymous aggregate data — no URLs or personal identifiers.</li>
            <li><strong className="text-slate-300">Resend:</strong> Used to send daily email reports. Only your email address is used.</li>
            <li><strong className="text-slate-300">Google OAuth:</strong> Used for account sign-in (via Supabase Auth).</li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <ul className="space-y-2 list-disc list-inside">
            <li>Raw browsing records: automatically deleted after the retention period you configure (default: 30 days)</li>
            <li>Daily aggregate stats: retained locally for up to 365 days</li>
            <li>AI analysis results: retained locally and in Supabase until you delete them</li>
            <li>Account data: retained until you delete your account</li>
          </ul>
        </Section>

        <Section title="5. Your Rights">
          <p>You can at any time:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Download or delete all local data from the extension options page (Settings → Privacy)</li>
            <li>Disable email reports in account settings</li>
            <li>Delete your Supabase account and all cloud data from account settings</li>
            <li>Disable tracking entirely from the options page</li>
          </ul>
        </Section>

        <Section title="6. Data Security">
          <p>
            Local data is protected by Chrome's security model — no other website or app can access it.
            Cloud data (Supabase) is transmitted over HTTPS and stored with encryption at rest.
            Row-level security (RLS) ensures each user can only access their own data.
          </p>
        </Section>

        <Section title="7. Children's Privacy">
          <p>
            EchoFocus is not designed for children under 13, and we do not intentionally collect personal information from that age group.
          </p>
        </Section>

        <Section title="8. Policy Changes">
          <p>
            We may update this privacy policy from time to time. Significant changes will be communicated through the extension.
            Continued use of EchoFocus after notification constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="9. Contact Us">
          <p>
            For any privacy-related questions, please reach out via GitHub Issues.
          </p>
        </Section>

        {/* Footer links */}
        <div className="border-t border-slate-800 pt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
        </div>
      </main>
    </div>
  )
}
