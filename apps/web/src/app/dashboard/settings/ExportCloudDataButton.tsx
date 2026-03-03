'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n'

export default function ExportCloudDataButton({ userId }: { userId: string }) {
  const { t } = useLocale()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const supabase = createClient()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0]

      const [{ data: aggregates }, { data: analyses }] = await Promise.all([
        supabase.from('synced_aggregates').select('date, total_seconds, productive_seconds, distraction_seconds, neutral_seconds, focus_score').eq('user_id', userId).gte('date', dateStr).order('date', { ascending: false }),
        supabase.from('ai_analyses').select('date, analysis_text, focus_score, created_at').eq('user_id', userId).gte('date', dateStr).order('date', { ascending: false }),
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        range: 'last_30_days',
        synced_aggregates: aggregates ?? [],
        ai_analyses: analyses ?? [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
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
    <div>
      <p className="text-xs text-slate-500 mb-2">{t.settings.exportDesc}</p>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="px-4 py-2 text-sm text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {isExporting ? t.settings.exporting : t.settings.exportData}
      </button>
    </div>
  )
}
