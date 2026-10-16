'use client'

import { useDemo } from '@/lib/demo'
import { useLocale } from '@/lib/i18n'

// The popup is the half of the product a demo visitor cannot open, so the demo
// Today page shows a still of it on the same fixture day. The pictures come
// from `pnpm capture:demo-popup` (2x, 360px wide). Nothing in /dev/preview,
// which mirrors the real Today page.
const WIDTH = 360
const HEIGHT = 694

export default function PopupShot() {
  const demo = useDemo()
  const { t, language } = useLocale()
  if (!demo) return null

  return (
    <section>
      <h2 className="text-label text-content-secondary">{t.demo.popupTitle}</h2>
      <p className="mt-1 max-w-[62ch] text-caption text-content-tertiary">{t.demo.popupNote}</p>
      <div className="mt-4 w-full max-w-[320px] overflow-hidden rounded-lg border border-line">
        {(['light', 'dark'] as const).map(theme => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={theme}
            src={`/demo/popup-${theme}-${language}.png`}
            alt={t.demo.popupAlt}
            width={WIDTH}
            height={HEIGHT}
            loading="lazy"
            className={`h-auto w-full theme-${theme}-only`}
          />
        ))}
      </div>
    </section>
  )
}
