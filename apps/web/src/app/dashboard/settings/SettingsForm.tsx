'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocale, type Language } from '@/lib/i18n'

// NOTE (Phase 0): the email-report toggle and "send test email" UI are hidden
// until a verified sending domain + scheduler exist. The user_preferences
// columns (email_report_enabled etc.) remain in the DB untouched.

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
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const update = <K extends keyof UserPreference>(key: K, value: UserPreference[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSaveState('idle')
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveState('idle')
    try {
      const supabase = createClient()
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: userId,
        ...prefs,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (error) {
        setSaveError(error.message)
        setSaveState('error')
      } else {
        setSaveState('saved')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : null)
      setSaveState('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm font-medium text-slate-400">{t.settings.preferences}</p>

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
                  ? 'bg-brand/10 border-brand/40 text-brand'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              {lang === 'en' ? t.settings.languageEn : t.settings.languageZhTW}
            </button>
          ))}
        </div>
      </div>

      {/* Email-report toggle + test-email button removed here (Phase 0):
          hidden until a verified sending domain + scheduler exist. */}

      {/* daily_goal_minutes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-slate-200">{t.settings.dailyFocusGoal}</p>
          <span className="text-sm font-semibold text-brand tabular-nums">
            {Math.floor(prefs.daily_goal_minutes / 60)}h{prefs.daily_goal_minutes % 60 > 0 ? ` ${prefs.daily_goal_minutes % 60}m` : ''}
          </span>
        </div>
        <input type="range" min={60} max={720} step={30} value={prefs.daily_goal_minutes}
          onChange={e => update('daily_goal_minutes', Number(e.target.value))}
          className="w-full accent-brand" />
        <div className="flex justify-between text-xs text-slate-600 mt-1"><span>{t.settings.range1hr}</span><span>{t.settings.range12hr}</span></div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {saveState === 'saved' ? (
          <span className="text-xs text-brand">{t.common.saved}</span>
        ) : saveState === 'error' ? (
          <span className="text-xs text-danger">{t.common.saveFailed}{saveError ?? ''}</span>
        ) : (
          <span />
        )}
        <button onClick={handleSave} disabled={isSaving}
          className="px-5 py-2 bg-brand hover:bg-brand-soft disabled:opacity-50 text-slate-950 text-sm font-semibold rounded-lg transition-colors">
          {isSaving ? t.common.saving : t.common.saveSettings}
        </button>
      </div>
    </section>
  )
}
