import React, { useState } from 'react'

interface AiInsightCardProps {
  analysisText: string
  analyzedAt: number  // Unix timestamp ms
  isLoading: boolean
}

export default function AiInsightCard({ analysisText, analyzedAt, isLoading }: AiInsightCardProps) {
  const [expanded, setExpanded] = useState(false)

  const PREVIEW_LEN = 80
  const isLong = analysisText.length > PREVIEW_LEN
  const displayText = expanded || !isLong
    ? analysisText
    : `${analysisText.slice(0, PREVIEW_LEN)}...`

  const timeStr = new Date(analyzedAt).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <p className="text-xs text-slate-400">AI 分析中...</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border-l-2 border-green-500 rounded-r-xl rounded-l-sm p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">🤖 AI 洞察</span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">
        {displayText}
      </p>
      <div className="flex items-center justify-between mt-2">
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-slate-500 hover:text-green-400 transition-colors"
          >
            {expanded ? '收起' : '展開'}
          </button>
        )}
        <span className="ml-auto text-xs text-slate-600">{timeStr} 分析</span>
      </div>
    </div>
  )
}
