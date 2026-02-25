import React, { useState } from 'react'

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
      title={isTracking ? '點擊暫停追蹤' : '點擊開始追蹤'}
    >
      {/* Animated dot */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isTracking ? 'bg-green-400 animate-pulse' : 'bg-slate-500'
        }`}
      />
      {isTracking ? '追蹤中' : '已暫停'}
    </button>
  )
}
