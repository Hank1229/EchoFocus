'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DeleteCloudDataButton({ userId }: { userId: string }) {
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
    return <p className="text-xs text-green-400">✓ All cloud data deleted</p>
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
      >
        Delete All Cloud Data
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-red-400">
        This permanently deletes all synced stats and AI analyses from the cloud. Local extension data is not affected and cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowConfirm(false)}
          className="flex-1 py-2 text-sm text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-colors font-semibold"
        >
          {isDeleting ? 'Deleting…' : 'Confirm Delete'}
        </button>
      </div>
    </div>
  )
}
