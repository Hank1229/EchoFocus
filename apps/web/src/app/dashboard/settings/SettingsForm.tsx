'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

interface UserPreference {
  email_report_enabled: boolean
  idle_timeout_minutes: number
  data_retention_days: number
  daily_goal_minutes: number
}

interface SettingsFormProps {
  userId: string
  initialPrefs: UserPreference | null
}

const DEFAULT_PREFS: UserPreference = {
  email_report_enabled: true,
  idle_timeout_minutes: 2,
  data_retention_days: 30,
  daily_goal_minutes: 360,
}

export default function SettingsForm({ userId, initialPrefs }: SettingsFormProps) {
  const [prefs, setPrefs] = useState<UserPreference>(initialPrefs ?? DEFAULT_PREFS)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const update = <K extends keyof UserPreference>(key: K, value: UserPreference[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSavedAt(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()
    await supabase.from('user_preferences').upsert({
      user_id: userId,
      ...prefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setIsSaving(false)
    setSavedAt(Date.now())
  }

  const handleSendTestEmail = async () => {
    setTestEmailStatus('sending')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setTestEmailStatus('error'); setTimeout(() => setTestEmailStatus('idle'), 3000); return }

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-email-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      })
      setTestEmailStatus(res.ok ? 'sent' : 'error')
      setTimeout(() => setTestEmailStatus('idle'), 3000)
    } catch {
      setTestEmailStatus('error')
      setTimeout(() => setTestEmailStatus('idle'), 3000)
    }
  }

  return (
    <section className="bg-slate-800 rounded-2xl p-6 space-y-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider">偏好設定</p>

      {/* email_report_enabled */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">每日 Email 報告</p>
          <p className="text-xs text-slate-500 mt-0.5">每日傳送生產力摘要至您的信箱</p>
        </div>
        <button
          onClick={() => update('email_report_enabled', !prefs.email_report_enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${prefs.email_report_enabled ? 'bg-green-500' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${prefs.email_report_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Send test email */}
      {prefs.email_report_enabled && (
        <div className="flex items-center justify-between pl-0 pt-0">
          <p className="text-xs text-slate-500">立即發送測試報告至您的信箱</p>
          <button
            onClick={handleSendTestEmail}
            disabled={testEmailStatus === 'sending'}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            {testEmailStatus === 'sending' ? '發送中...'
              : testEmailStatus === 'sent' ? '✓ 已發送'
              : testEmailStatus === 'error' ? '發送失敗'
              : '發送測試郵件'}
          </button>
        </div>
      )}

      {/* daily_goal_minutes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-slate-200">每日專注目標</p>
          <span className="text-sm font-semibold text-green-400 tabular-nums">
            {Math.floor(prefs.daily_goal_minutes / 60)} 小時{prefs.daily_goal_minutes % 60 > 0 ? ` ${prefs.daily_goal_minutes % 60} 分` : ''}
          </span>
        </div>
        <input type="range" min={60} max={720} step={30} value={prefs.daily_goal_minutes}
          onChange={e => update('daily_goal_minutes', Number(e.target.value))}
          className="w-full accent-green-500" />
        <div className="flex justify-between text-xs text-slate-600 mt-1"><span>1 小時</span><span>12 小時</span></div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {savedAt ? <span className="text-xs text-green-400">✓ 已儲存</span> : <span />}
        <button onClick={handleSave} disabled={isSaving}
          className="px-5 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {isSaving ? '儲存中…' : '儲存設定'}
        </button>
      </div>
    </section>
  )
}
