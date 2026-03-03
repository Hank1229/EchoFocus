'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocale, type Language } from '@/lib/i18n'

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
  const { t, language, setLanguage } = useLocale()
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-6 space-y-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{t.settings.preferences}</p>

      {/* Language */}
      <div>
        <p className="text-sm font-medium text-slate-200 mb-2">{t.settings.language}</p>
        <div className="flex gap-2">
          {(['en', 'zh-TW'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                language === lang
                  ? 'bg-green-500/10 border-green-500/40 text-green-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              {lang === 'en' ? t.settings.languageEn : t.settings.languageZhTW}
            </button>
          ))}
        </div>
      </div>

      {/* email_report_enabled */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">{t.settings.dailyEmailReport}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t.settings.emailReportDesc}</p>
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
          <p className="text-xs text-slate-500">{t.settings.sendTestReport}</p>
          <button
            onClick={handleSendTestEmail}
            disabled={testEmailStatus === 'sending'}
            className="px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            {testEmailStatus === 'sending' ? t.settings.sending
              : testEmailStatus === 'sent' ? t.settings.sent
              : testEmailStatus === 'error' ? t.settings.failed
              : t.settings.sendTestEmail}
          </button>
        </div>
      )}

      {/* daily_goal_minutes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-slate-200">{t.settings.dailyFocusGoal}</p>
          <span className="text-sm font-semibold text-green-400 tabular-nums">
            {Math.floor(prefs.daily_goal_minutes / 60)}h{prefs.daily_goal_minutes % 60 > 0 ? ` ${prefs.daily_goal_minutes % 60}m` : ''}
          </span>
        </div>
        <input type="range" min={60} max={720} step={30} value={prefs.daily_goal_minutes}
          onChange={e => update('daily_goal_minutes', Number(e.target.value))}
          className="w-full accent-green-500" />
        <div className="flex justify-between text-xs text-slate-600 mt-1"><span>{t.settings.range1hr}</span><span>{t.settings.range12hr}</span></div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {savedAt ? <span className="text-xs text-green-400">{t.common.saved}</span> : <span />}
        <button onClick={handleSave} disabled={isSaving}
          className="px-5 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {isSaving ? t.common.saving : t.common.saveSettings}
        </button>
      </div>
    </section>
  )
}
