'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLocale, type Language } from '@/lib/i18n'
import SettingRow from './SettingRow'

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

  const goalHours = Math.floor(prefs.daily_goal_minutes / 60)
  const goalMinutes = prefs.daily_goal_minutes % 60

  return (
    <>
      <SettingRow label={t.settings.language} description={t.settings.languageDesc}>
        <div className="inline-flex rounded-lg border border-slate-800 p-0.5">
          {(['en', 'zh-TW'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              aria-pressed={language === lang}
              className={`rounded-md px-3.5 py-1.5 text-sm transition-colors ${
                language === lang ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {lang === 'en' ? t.settings.languageEn : t.settings.languageZhTW}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow label={t.settings.dailyFocusGoal} description={t.settings.dailyGoalDesc} stack>
        <div className="max-w-sm">
          <p className="font-display text-2xl font-semibold tabular-nums text-slate-100">
            {goalHours}h{goalMinutes > 0 ? ` ${goalMinutes}m` : ''}
          </p>
          <input
            type="range"
            min={60}
            max={720}
            step={30}
            value={prefs.daily_goal_minutes}
            onChange={e => update('daily_goal_minutes', Number(e.target.value))}
            aria-label={t.settings.dailyFocusGoal}
            className="mt-3 w-full accent-brand"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-600">
            <span>{t.settings.range1hr}</span>
            <span>{t.settings.range12hr}</span>
          </div>
        </div>
      </SettingRow>

      {/* Sits in the control column so the action lines up with what it saves. */}
      <div className="grid gap-x-10 border-b border-slate-800/80 py-6 sm:grid-cols-[16rem_1fr]">
        <span className="hidden sm:block" />
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-soft disabled:opacity-60"
          >
            {isSaving ? t.common.saving : t.common.saveSettings}
          </button>
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-brand">
              <Check size={13} strokeWidth={2} /> {t.common.saved}
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-xs text-danger">{t.common.saveFailed}{saveError ?? ''}</span>
          )}
        </div>
      </div>
    </>
  )
}
