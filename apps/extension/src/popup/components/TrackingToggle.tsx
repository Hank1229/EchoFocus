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
      className={`pressable flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-label ${
        isTracking
          ? 'border-transparent bg-accent-subtle text-accent'
          : 'border-line bg-surface text-content-secondary hover:bg-surface-hover'
      } ${pending ? 'cursor-not-allowed opacity-50' : ''}`}
      title={isTracking ? t.popup.clickToPause : t.popup.clickToResume}
    >
      {isTracking ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
      {isTracking ? t.popup.tracking : t.popup.paused}
    </button>
  )
}
