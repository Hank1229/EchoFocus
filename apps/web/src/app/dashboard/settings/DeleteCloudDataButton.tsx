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
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    const supabase = createClient()
    const results = await Promise.all([
      supabase.from('synced_aggregates').delete().eq('user_id', userId),
      supabase.from('ai_analyses').delete().eq('user_id', userId),
    ])
    setIsDeleting(false)

    // Telling someone their data is gone when it is not is the one mistake this
    // button must never make.
    const failed = results.find(r => r.error)
    if (failed?.error) {
      setError(failed.error.message)
      return
    }
    setShowConfirm(false)
    setDone(true)
  }

  if (done) {
    return (
      <p className="flex items-center gap-1 text-caption text-accent">
        <Check size={12} strokeWidth={1.5} /> {t.settings.deleted}
      </p>
    )
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="pressable flex items-center gap-2 rounded-md border border-line px-4 py-2 text-label hover:bg-surface-hover" style={{ color: 'var(--danger)' }}
      >
        <Trash2 size={14} strokeWidth={1.5} />
        {t.settings.deleteAction}
      </button>
    )
  }

  return (
    <div className="max-w-md rounded-lg border border-line bg-surface p-4">
      <p className="text-caption leading-relaxed" style={{ color: 'var(--danger)' }}>{t.settings.deleteCloudConfirm}</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="pressable rounded-md px-4 py-2 text-label font-semibold disabled:opacity-50" style={{ background: 'var(--danger)', color: 'var(--bg)' }}
        >
          {isDeleting ? t.settings.deleting : t.settings.confirmDelete}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="pressable rounded-md px-4 py-2 text-label text-content-secondary hover:text-content"
        >
          {t.settings.cancel}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-caption leading-relaxed" style={{ color: 'var(--danger)' }}>
          {t.settings.deleteFailed}{error}
        </p>
      )}
    </div>
  )
}
