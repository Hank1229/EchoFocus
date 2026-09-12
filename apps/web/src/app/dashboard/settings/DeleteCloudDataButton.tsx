'use client'

import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
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
        className="flex items-center gap-2 rounded-lg border border-danger/30 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
      >
        <Trash2 size={14} strokeWidth={1.75} />
        {t.settings.deleteAction}
      </button>
    )
  }

  return (
    <div className="max-w-md rounded-lg border border-danger/30 bg-danger/[0.06] p-4">
      <p className="text-xs leading-relaxed text-danger">{t.settings.deleteCloudConfirm}</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg bg-danger-deep px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-danger disabled:opacity-50"
        >
          {isDeleting ? t.settings.deleting : t.settings.confirmDelete}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          {t.settings.cancel}
        </button>
      </div>
    </div>
  )
}
