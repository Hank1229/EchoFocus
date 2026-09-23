'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLocale, type Language } from '@/lib/i18n'
import { useTheme, type ThemePreference } from '@/lib/theme'
import SettingRow from '@/components/dashboard/SettingRow'

// NOTE (Phase 0): the email-report toggle and "send test email" UI are hidden
// until a verified sending domain + scheduler exist. The user_preferences
// columns (email_report_enabled etc.) remain in the DB untouched.

interface UserPreference {
  email_report_enabled: boolean
  idle_timeout_minutes: number
  data_retention_days: number
  daily_goal_minutes: number
  pomodoro_focus_minutes: number
  pomodoro_break_minutes: number
  pomodoro_reminders_enabled: boolean
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
  pomodoro_focus_minutes: 25,
  pomodoro_break_minutes: 5,
  pomodoro_reminders_enabled: true,
}

function SegmentedControl<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { key: T; label: string }[]
  value: T
  onSelect: (key: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-line p-0.5">
      {options.map(option => (
        <button
          key={option.key}
          onClick={() => onSelect(option.key)}
          aria-pressed={value === option.key}
          className={`pressable whitespace-nowrap rounded px-3.5 py-1.5 text-label ${
            value === option.key
              ? 'bg-accent-subtle text-accent'
              : 'text-content-secondary hover:text-content'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Slider({
  value,
  valueText,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  ariaLabel,
  onChange,
}: {
  value: number
  valueText: string
  min: number
  max: number
  step?: number
  minLabel: string
  maxLabel: string
  ariaLabel: string
  onChange: (value: number) => void
}) {
  return (
    <div className="max-w-sm">
      <p className="text-stat text-content">{valueText}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="mt-3 w-full accent-[var(--accent)]"
      />
      <div className="mt-1 flex justify-between text-caption text-content-tertiary">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

function Switch({ checked, onToggle, ariaLabel }: { checked: boolean; onToggle: () => void; ariaLabel: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`pressable relative h-6 w-11 flex-shrink-0 rounded-full ${
        checked ? 'bg-accent' : 'border border-line-strong bg-surface-hover'
      }`}
    >
      <span
        aria-hidden
        className="absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full"
        style={{
          height: 18,
          width: 18,
          left: checked ? 22 : 3,
          background: checked ? 'var(--on-accent)' : 'var(--text-tertiary)',
          transition: 'left var(--dur-base) var(--ease), background-color var(--dur-base) var(--ease)',
        }}
      />
    </button>
  )
}

export default function SettingsForm({ userId, initialPrefs }: SettingsFormProps) {
  const { t, language, setLanguage } = useLocale()
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useState<UserPreference>({ ...DEFAULT_PREFS, ...initialPrefs })
  const [isSaving, setIsSaving] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const update = <K extends keyof UserPreference>(key: K, value: UserPreference[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSaveState('idle')
  }

  const save = async () => {
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
  const goalText = goalMinutes > 0
    ? t.settings.hoursMinutesUnit.replace('{h}', String(goalHours)).replace('{m}', String(goalMinutes))
    : t.settings.hoursUnit.replace('{n}', String(goalHours))
  const minutes = (n: number) => t.settings.minutesUnit.replace('{n}', String(n))

  return (
    <>
      <SettingRow label={t.settings.language} description={t.settings.languageDesc}>
        <SegmentedControl<Language>
          options={[
            { key: 'en', label: t.settings.languageEn },
            { key: 'zh-TW', label: t.settings.languageZhTW },
          ]}
          value={language}
          onSelect={setLanguage}
        />
      </SettingRow>

      {/* Theme applies on click, like language — it is a view preference, not
          a form field, so it does not wait for Save. */}
      <SettingRow label={t.settings.theme} description={t.settings.themeDesc}>
        <SegmentedControl<ThemePreference>
          options={[
            { key: 'light', label: t.settings.themeLight },
            { key: 'dark', label: t.settings.themeDark },
            { key: 'system', label: t.settings.themeSystem },
          ]}
          value={theme}
          onSelect={setTheme}
        />
      </SettingRow>

      <SettingRow label={t.settings.dailyFocusGoal} description={t.settings.dailyGoalDesc} stack>
        <Slider
          value={prefs.daily_goal_minutes}
          valueText={goalText}
          min={60}
          max={720}
          step={30}
          minLabel={t.settings.range1hr}
          maxLabel={t.settings.range12hr}
          ariaLabel={t.settings.dailyFocusGoal}
          onChange={v => update('daily_goal_minutes', v)}
        />
      </SettingRow>

      <SettingRow label={t.settings.idleTimeout} description={t.settings.idleTimeoutDesc} stack>
        <Slider
          value={prefs.idle_timeout_minutes}
          valueText={minutes(prefs.idle_timeout_minutes)}
          min={1}
          max={30}
          minLabel={t.settings.range1min}
          maxLabel={t.settings.range30min}
          ariaLabel={t.settings.idleTimeout}
          onChange={v => update('idle_timeout_minutes', v)}
        />
      </SettingRow>

      <SettingRow label={t.settings.dataRetention} description={t.settings.dataRetentionDesc} stack>
        <Slider
          value={prefs.data_retention_days}
          valueText={t.settings.daysUnit.replace('{n}', String(prefs.data_retention_days))}
          min={7}
          max={365}
          step={7}
          minLabel={t.settings.range7days}
          maxLabel={t.settings.range365days}
          ariaLabel={t.settings.dataRetention}
          onChange={v => update('data_retention_days', v)}
        />
      </SettingRow>

      {/* ── Focus timer ──────────────────────────────────────────────── */}
      <div className="mt-10">
        <h3 className="text-label text-content-secondary">{t.settings.focusTimer}</h3>
        <p className="mt-1 text-caption text-content-tertiary">{t.settings.pomodoroSyncNote}</p>
      </div>

      <SettingRow label={t.settings.focusDuration} description={t.settings.focusDurationDesc} stack>
        <Slider
          value={prefs.pomodoro_focus_minutes}
          valueText={minutes(prefs.pomodoro_focus_minutes)}
          min={5}
          max={120}
          step={5}
          minLabel={minutes(5)}
          maxLabel={minutes(120)}
          ariaLabel={t.settings.focusDuration}
          onChange={v => update('pomodoro_focus_minutes', v)}
        />
      </SettingRow>

      <SettingRow label={t.settings.breakDuration} description={t.settings.breakDurationDesc} stack>
        <Slider
          value={prefs.pomodoro_break_minutes}
          valueText={minutes(prefs.pomodoro_break_minutes)}
          min={1}
          max={30}
          minLabel={minutes(1)}
          maxLabel={minutes(30)}
          ariaLabel={t.settings.breakDuration}
          onChange={v => update('pomodoro_break_minutes', v)}
        />
      </SettingRow>

      <SettingRow label={t.settings.pomodoroReminders} description={t.settings.pomodoroRemindersDesc}>
        <div>
          <Switch
            checked={prefs.pomodoro_reminders_enabled}
            onToggle={() => update('pomodoro_reminders_enabled', !prefs.pomodoro_reminders_enabled)}
            ariaLabel={t.settings.pomodoroReminders}
          />
          <p className="mt-3 max-w-[42ch] text-caption text-content-tertiary">
            {t.settings.pomodoroDndNote}
          </p>
        </div>
      </SettingRow>

      {/* Sits in the control column so the action lines up with what it saves. */}
      <div className="grid gap-x-10 border-b border-line py-6 sm:grid-cols-[16rem_1fr]">
        <span className="hidden sm:block" />
        <div>
          <div className="flex items-center gap-4">
            <button
              onClick={save}
              disabled={isSaving}
              className="pressable rounded-md bg-accent px-5 py-2 text-label text-accent-ink disabled:opacity-60"
            >
              {isSaving ? t.common.saving : t.common.saveSettings}
            </button>
            {saveState === 'saved' && (
              <span className="flex items-center gap-1.5 text-caption text-accent">
                <Check size={13} strokeWidth={1.5} /> {t.common.saved}
              </span>
            )}
            {saveState === 'error' && (
              <span className="text-caption" style={{ color: 'var(--danger)' }}>{t.common.saveFailed}{saveError ?? ''}</span>
            )}
          </div>
          <p className="mt-3 max-w-[52ch] text-caption text-content-tertiary">
            {t.settings.extensionPrefsNote}
          </p>
        </div>
      </div>
    </>
  )
}
