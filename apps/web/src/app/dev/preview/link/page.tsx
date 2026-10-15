import { notFound } from 'next/navigation'
import { getLocale } from '@/lib/i18n-server'
import ExtensionLinkCard, { ExtensionLinkView, type LinkNotice, type LinkStatus } from '@/components/dashboard/ExtensionLinkCard'

// Harness for the extension link card. The top block is the live card, talking
// to whatever extension this browser has: ?user=<uuid>&email=&data=1 stand in
// for the signed-in account, so tests/e2e can play every account case without
// Supabase. Below it, every state laid out for review. Dev only, production 404s.

const FALLBACK_USER = '00000000-0000-4000-8000-000000000000'
const FALLBACK_EMAIL = 'preview@echofocus.dev'

const STATES: Array<{ status: LinkStatus; notice: LinkNotice }> = [
  { status: 'checking', notice: null },
  { status: 'not-installed', notice: null },
  { status: 'unlinked', notice: null },
  { status: 'unlinked', notice: 'connecting' },
  { status: 'linked', notice: 'linked' },
  { status: 'linked', notice: null },
  { status: 'other-account', notice: null },
  { status: 'device-linked-elsewhere', notice: null },
  { status: 'unlinked', notice: 'failed' },
  { status: 'unlinked', notice: 'busy' },
  { status: 'unlinked', notice: 'mismatch' },
]

export default async function LinkPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; email?: string; data?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { user, email, data } = await searchParams
  const { t } = await getLocale()
  const userId = user ?? FALLBACK_USER
  const userEmail = email ?? FALLBACK_EMAIL

  return (
    <main className="min-h-screen bg-canvas px-6 py-8">
      <section data-testid="live-today">
        <h2 className="mb-3 text-label text-content-secondary">{t.today.title}</h2>
        <ExtensionLinkCard variant="today" userId={userId} email={userEmail} hasAnyData={data === '1'} />
      </section>
      <section data-testid="live-settings" className="mt-8">
        <h2 className="text-label text-content-secondary">{t.settings.tabAccount}</h2>
        <ExtensionLinkCard variant="settings" userId={userId} email={userEmail} hasAnyData />
      </section>

      <div className="mt-12 grid gap-x-10 gap-y-2 border-t border-line pt-8 lg:grid-cols-2">
        {STATES.map(({ status, notice }) => (
          <div key={`${status}-${notice}`} className="contents">
            <ExtensionLinkView status={status} notice={notice} email={userEmail} variant="today" />
            <ExtensionLinkView status={status} notice={notice} email={userEmail} variant="settings" />
          </div>
        ))}
      </div>
    </main>
  )
}
