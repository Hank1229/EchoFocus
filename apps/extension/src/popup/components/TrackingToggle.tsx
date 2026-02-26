import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface TrackingToggleProps {
  isTracking: boolean
  onToggle: () => Promise<void>
}

export default function TrackingToggle({ isTracking, onToggle }: TrackingToggleProps) {
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
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
      onClick={handleClick}
      disabled={pending}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
        transition-all duration-200 border
        ${isTracking
          ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
          : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
        }
        ${pending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={isTracking ? 'Click to pause tracking' : 'Click to resume tracking'}
    >
      {isTracking
        ? <Eye size={18} strokeWidth={1.75} />
        : <EyeOff size={18} strokeWidth={1.75} />
      }
      {isTracking ? 'Tracking' : 'Paused'}
    </button>
  )
}
