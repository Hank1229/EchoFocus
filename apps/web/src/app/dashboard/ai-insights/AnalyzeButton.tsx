'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lightbulb, MessageCircle } from 'lucide-react'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

interface AnalysisResult {
  analysis_text: string
  focus_score: number
}

export default function AnalyzeButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in first')
        return
      }

      // Fetch today's synced aggregate
      const today = new Date().toISOString().slice(0, 10)
      const { data: agg } = await supabase
        .from('synced_aggregates')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .maybeSingle()

      if (!agg) {
        setError('No synced data for today — please sync manually from the extension first')
        return
      }

      const payload = {
        date: today,
        aggregate: {
          date: today,
          totalMinutes: Math.round(agg.total_seconds / 60),
          productiveMinutes: Math.round(agg.productive_seconds / 60),
          distractionMinutes: Math.round(agg.distraction_seconds / 60),
          neutralMinutes: Math.round((agg.neutral_seconds + agg.uncategorized_seconds) / 60),
          focusScore: agg.focus_score,
          topDomains: (agg.top_domains ?? []).slice(0, 8).map((d: { domain: string; seconds: number; category: string }) => ({
            domain: d.domain,
            minutes: Math.round(d.seconds / 60),
            category: d.category,
          })),
        },
      }

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/ai-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errText = await res.text()
        setError(`Analysis failed: ${errText}`)
        return
      }

      const data = await res.json() as AnalysisResult
      setResult(data)
      router.refresh()  // Reload server data so history list shows new entry
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating your snapshot…
          </>
        ) : (
          <>
            <Lightbulb size={18} strokeWidth={1.75} />
            {"Generate Today's Snapshot"}
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-slate-800 border-l-4 border-green-500 rounded-r-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <MessageCircle size={18} strokeWidth={1.75} className="text-blue-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Today's Daily Snapshot</span>
            </div>
            <span className="ml-auto text-sm font-bold text-green-400">{result.focus_score} pts</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{result.analysis_text}</p>
          <p className="text-xs text-slate-600 mt-3">Reload the page to see this in the list below</p>
        </div>
      )}
    </div>
  )
}
