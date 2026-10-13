'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { fetchCloudExport } from './cloud-export'

export default function ExportCloudDataButton({ userId }: { userId: string }) {
  const { t } = useLocale()
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      // A read that failed must not become a download of nothing.
      const outcome = await fetchCloudExport(userId)
      if (!outcome.ok) {
        setError(outcome.message)
        return
      }

      const blob = new Blob([JSON.stringify(outcome.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `echofocus-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="pressable flex items-center gap-2 rounded-md border border-line px-4 py-2 text-label text-content-secondary hover:border-line-strong hover:text-content disabled:opacity-50"
      >
        <Download size={14} strokeWidth={1.5} />
        {isExporting ? t.settings.exporting : t.settings.exportAction}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-caption leading-relaxed" style={{ color: 'var(--danger)' }}>
          {t.common.loadFailed}{error}
        </p>
      )}
    </>
  )
}
