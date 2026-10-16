'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n'

// Top of every /demo page, in the Settings privacy tab's note box: the data
// is a fixture, and the way back to the landing page.
export default function DemoBanner() {
  const { t } = useLocale()

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 pt-4">
      <div
        role="note"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3 text-caption leading-relaxed text-content-secondary"
      >
        <p>{t.demo.banner}</p>
        <Link href="/" className="pressable flex-shrink-0 text-label text-accent">
          {t.demo.backHome}
        </Link>
      </div>
    </div>
  )
}
