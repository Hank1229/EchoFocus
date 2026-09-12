import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLocale } from '../../lib/i18n'

interface TrackingToggleProps {
  isTracking: boolean
  onToggle: () => Promise<void>
}

export default function TrackingToggle({ isTracking, onToggle }: TrackingToggleProps) {
  const { t } = useLocale()
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    if (pending) return
    setPending(true)
    try {
      await onToggle()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        isTracking
          ? 'border-brand/30 bg-brand/10 text-brand hover:bg-brand/20'
          : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:bg-slate-800'
      } ${pending ? 'cursor-not-allowed opacity-50' : ''}`}
      title={isTracking ? t.popup.clickToPause : t.popup.clickToResume}
    >
      {isTracking ? <Eye size={14} strokeWidth={2} /> : <EyeOff size={14} strokeWidth={2} />}
      {isTracking ? t.popup.tracking : t.popup.paused}
    </button>
  )
}
