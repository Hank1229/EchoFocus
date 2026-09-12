'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n'

export default function DeleteCloudDataButton({ userId }: { userId: string }) {
  const { t } = useLocale()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [done, setDone] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('synced_aggregates').delete().eq('user_id', userId),
      supabase.from('ai_analyses').delete().eq('user_id', userId),
    ])
    setIsDeleting(false)
    setShowConfirm(false)
    setDone(true)
  }

  if (done) {
    return (
      <p className="flex items-center gap-1 text-xs text-brand">
        <Check size={12} strokeWidth={2} /> {t.settings.deleted}
      </p>
    )
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 text-sm text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition-colors"
      >
        {t.settings.deleteAllCloud}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-danger">
        {t.settings.deleteCloudConfirm}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowConfirm(false)}
          className="flex-1 py-2 text-sm text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
        >
          {t.settings.cancel}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 py-2 text-sm text-white bg-danger-deep hover:bg-danger disabled:opacity-50 rounded-lg transition-colors font-semibold"
        >
          {isDeleting ? t.settings.deleting : t.settings.confirmDelete}
        </button>
      </div>
    </div>
  )
}
