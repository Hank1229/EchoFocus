import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowUpRight, Check, Download, Lock, Upload, X } from 'lucide-react'
import iconSrc from '../assets/icon-32.png'
import type { Settings, ClassificationRule, Category, MatchType, DailyAggregate } from '@echofocus/shared'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import type { Session } from '@supabase/supabase-js'
import { signInWithGoogle, signOut, getSession } from '../lib/auth'
import { syncAggregateForDate, getLastSyncTime } from '../lib/sync'
import { isDailySummaryEnabled, setDailySummaryEnabled } from '../background/notifications'
import { mergeImportedRules } from './rules-import'
import { getTodayDateString, getDateNDaysAgo } from '@echofocus/shared'
import { useLocale, type Language } from '../lib/i18n'
import { DASHBOARD_URL } from '../lib/config'
import { sendMessage } from '../lib/messaging'

const APP_VERSION = '1.0.0'

type Tab = 'general' | 'categories' | 'privacy' | 'account' | 'about'

const CATEGORY_COLORS: Record<Category, string> = {
  productive: 'text-productive',
  distraction: 'text-breaks',
  neutral: 'text-neutral',
  uncategorized: 'text-neutral-deep',
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`pressable relative h-6 w-11 flex-shrink-0 rounded-full ${checked ? 'bg-accent' : 'border border-line-strong bg-surface-hover'}`}
    >
      <span
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 rounded-full"
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

// ─── General Tab ──────────────────────────────────────────────────────────

function GeneralTab() {
  const { t, language, setLanguage } = useLocale()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [dailySummary, setDailySummary] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [loaded, summaryEnabled] = await Promise.all([
        sendMessage<Settings>('GET_SETTINGS'),
        isDailySummaryEnabled(),
      ])
      if (loaded?.data) setSettings(loaded.data)
      setDailySummary(summaryEnabled)
      setIsLoading(false)
    }
    void load()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveFailed(false)
    const response = await sendMessage('SAVE_SETTINGS', settings)
    await setDailySummaryEnabled(dailySummary)
    setIsSaving(false)
    if (response?.success) setSavedAt(Date.now())
    else setSaveFailed(true)
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSavedAt(null)
    setSaveFailed(false)
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-24 rounded bg-surface-hover" /></div>
  }

  return (
    <div className="space-y-6">
      <section className="bg-surface rounded-lg p-5 space-y-5">
        <h2 className="text-xs font-medium text-content-secondary">{t.general.tracking}</h2>

        {/* trackingEnabled */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-content">{t.general.enableTracking}</p>
            <p className="text-xs text-content-tertiary mt-0.5">{t.general.enableTrackingDesc}</p>
          </div>
          <Toggle checked={settings.trackingEnabled} onChange={value => update('trackingEnabled', value)} label={t.general.enableTracking} />
        </div>

        {/* idleTimeoutMinutes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-content">{t.general.idleTimeout}</p>
              <p className="text-xs text-content-tertiary mt-0.5">{t.general.idleTimeoutDesc}</p>
            </div>
            <span className="text-sm font-semibold text-accent tabular-nums">{settings.idleTimeoutMinutes} {t.general.min}</span>
          </div>
          <input type="range" min={1} max={30} value={settings.idleTimeoutMinutes}
            onChange={e => update('idleTimeoutMinutes', Number(e.target.value))}
            className="w-full accent-[var(--accent)]" />
          <div className="flex justify-between text-xs text-content-tertiary mt-1"><span>{t.general.range1Min}</span><span>{t.general.range30Min}</span></div>
        </div>
      </section>

      <section className="bg-surface rounded-lg p-5 space-y-5">
        <h2 className="text-xs font-medium text-content-secondary">{t.general.goalsAndData}</h2>

        {/* dailyGoalMinutes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-content">{t.general.dailyFocusGoal}</p>
              <p className="text-xs text-content-tertiary mt-0.5">{t.general.dailyFocusGoalDesc}</p>
            </div>
            <span className="text-sm font-semibold text-accent tabular-nums">
              {Math.floor(settings.dailyGoalMinutes / 60)}h{settings.dailyGoalMinutes % 60 > 0 ? ` ${settings.dailyGoalMinutes % 60}m` : ''}
            </span>
          </div>
          <input type="range" min={60} max={720} step={30} value={settings.dailyGoalMinutes}
            onChange={e => update('dailyGoalMinutes', Number(e.target.value))}
            className="w-full accent-[var(--accent)]" />
          <div className="flex justify-between text-xs text-content-tertiary mt-1"><span>{t.general.range1hr}</span><span>{t.general.range12hr}</span></div>
        </div>

        {/* dataRetentionDays */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-content">{t.general.dataRetention}</p>
              <p className="text-xs text-content-tertiary mt-0.5">{t.general.dataRetentionDesc}</p>
            </div>
            <span className="text-sm font-semibold text-accent tabular-nums">{settings.dataRetentionDays} {t.general.day}</span>
          </div>
          <input type="range" min={7} max={365} step={7} value={settings.dataRetentionDays}
            onChange={e => update('dataRetentionDays', Number(e.target.value))}
            className="w-full accent-[var(--accent)]" />
          <div className="flex justify-between text-xs text-content-tertiary mt-1"><span>{t.general.range7d}</span><span>{t.general.range365d}</span></div>
        </div>
      </section>

      <section className="bg-surface rounded-lg p-5 space-y-5">
        <h2 className="text-xs font-medium text-content-secondary">{t.general.notifications}</h2>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-content">{t.general.dailySummary}</p>
            <p className="text-xs text-content-tertiary mt-0.5">{t.general.dailySummaryDesc}</p>
          </div>
          <Toggle
            checked={dailySummary}
            onChange={value => { setDailySummary(value); setSavedAt(null) }}
            label={t.general.dailySummary}
          />
        </div>
      </section>

      {/* Language setting */}
      <section className="px-5 space-y-3">
        <h2 className="text-xs font-medium text-content-secondary">{t.general.language}</h2>
        <p className="text-xs text-content-tertiary">{t.general.languageDesc}</p>
        <div className="flex gap-2">
          {(['en', 'zh-TW'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                language === lang
                  ? 'bg-accent-subtle text-accent border-accent'
                  : 'text-content-secondary border-line-strong hover:text-content hover:border-line-strong'
              }`}
            >
              {lang === 'en' ? t.general.english : t.general.traditionalChinese}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between pt-1">
        {savedAt ? (
          <span className="flex items-center gap-1.5 text-xs text-accent">
            <Check size={13} strokeWidth={2.5} />{t.general.saved}
          </span>
        ) : saveFailed ? (
          <span role="alert" className="flex items-center gap-1.5 text-xs text-danger">
            <X size={13} strokeWidth={2.5} />{t.common.saveFailed}
          </span>
        ) : <span />}
        <button onClick={handleSave} disabled={isSaving}
          className="px-5 py-2 bg-accent hover:bg-accent disabled:opacity-50 text-accent-ink text-sm font-semibold rounded-lg transition-colors">
          {isSaving ? t.general.saving : t.general.saveSettings}
        </button>
      </div>
    </div>
  )
}

// ─── Categories Tab ───────────────────────────────────────────────────────

function CategoriesTab() {
  const { t } = useLocale()
  const [rules, setRules] = useState<ClassificationRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  // New rule form state
  const [newPattern, setNewPattern] = useState('')
  const [newMatchType, setNewMatchType] = useState<MatchType>('exact')
  const [newCategory, setNewCategory] = useState<Category>('productive')

  const fileInput = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const CATEGORY_LABELS: Record<Category, string> = {
    productive: t.categories.categoryLabels.productive,
    distraction: t.categories.categoryLabels.distraction,
    neutral: t.categories.categoryLabels.neutral,
    uncategorized: t.categories.categoryLabels.uncategorized,
  }

  const MATCH_TYPE_LABELS: Record<MatchType, string> = {
    exact: t.categories.matchTypes.exact,
    wildcard: t.categories.matchTypes.wildcard,
    path: t.categories.matchTypes.path,
  }

  const load = useCallback(async () => {
    const loaded = await sendMessage<ClassificationRule[]>('GET_CUSTOM_RULES')
    setRules(loaded?.data ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  // Returns whether the worker confirmed the write, so the callers that show
  // their own message don't claim success on top of a failed save.
  const saveRules = async (updated: ClassificationRule[]): Promise<boolean> => {
    setIsSaving(true)
    setSaveFailed(false)
    const response = await sendMessage('SAVE_CUSTOM_RULES', updated)
    setIsSaving(false)
    if (!response?.success) {
      setSaveFailed(true)
      // The rules on screen are not the rules in storage any more — show what
      // the worker actually has rather than a list the user cannot trust.
      await load()
      return false
    }
    setSavedAt(Date.now())
    return true
  }

  const addRule = async () => {
    const pattern = newPattern.trim().toLowerCase()
    if (!pattern) return
    const rule: ClassificationRule = {
      id: crypto.randomUUID(),
      pattern,
      matchType: newMatchType,
      category: newCategory,
      isDefault: false,
      createdAt: Date.now(),
    }
    const updated = [rule, ...rules]
    setRules(updated)
    if (await saveRules(updated)) setNewPattern('')
  }

  const deleteRule = async (id: string) => {
    const updated = rules.filter(r => r.id !== id)
    setRules(updated)
    await saveRules(updated)
  }

  // Object URL + a temporary anchor: the same download path the Privacy tab
  // already uses, and `blob:` is untouched by the extension_pages CSP.
  const exportRules = () => {
    const blob = new Blob([JSON.stringify(rules, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `echofocus-rules-${getTodayDateString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importRules = async (file: File) => {
    setImportMessage(null)

    let raw: unknown
    try {
      raw = JSON.parse(await file.text())
    } catch {
      setImportMessage({ text: t.categories.importUnreadable, ok: false })
      return
    }

    const merged = mergeImportedRules(rules, raw)
    if (!merged) {
      setImportMessage({ text: t.categories.importNotRules, ok: false })
      return
    }

    if (merged.added > 0) {
      setRules(merged.rules)
      if (!await saveRules(merged.rules)) {
        setImportMessage({ text: t.common.saveFailed, ok: false })
        return
      }
    }
    setImportMessage({
      text: t.categories.importResult
        .replace('{added}', String(merged.added))
        .replace('{skipped}', String(merged.skipped)),
      // Nothing imported is a failed import, however well-formed the file was.
      ok: merged.added > 0,
    })
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-24 rounded bg-surface-hover" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Add rule form */}
      <section className="bg-surface rounded-lg p-5">
        <h2 className="text-xs font-medium text-content-secondary mb-4">{t.categories.addCustomRule}</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={newPattern}
            onChange={e => setNewPattern(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void addRule() }}
            placeholder={t.categories.patternPlaceholder}
            className="w-full bg-surface-hover border border-line-strong rounded-lg px-3 py-2 text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <select value={newMatchType} onChange={e => setNewMatchType(e.target.value as MatchType)}
              className="flex-1 bg-surface-hover border border-line-strong rounded-lg px-3 py-2 text-sm text-content focus:outline-none focus:border-accent">
              {(Object.entries(MATCH_TYPE_LABELS) as [MatchType, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)}
              className="flex-1 bg-surface-hover border border-line-strong rounded-lg px-3 py-2 text-sm text-content focus:outline-none focus:border-accent">
              {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <button onClick={() => void addRule()} disabled={!newPattern.trim() || isSaving}
            className="w-full py-2 bg-accent hover:bg-accent disabled:opacity-50 text-accent-ink text-sm font-semibold rounded-lg transition-colors">
            {t.categories.addRule}
          </button>
        </div>
      </section>

      {/* Rule list */}
      <section className="border border-line-strong rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-line-strong flex items-center justify-between">
          <h2 className="text-xs font-medium text-content-secondary">
            {t.categories.customRules} ({rules.length})
          </h2>
          {saveFailed ? (
            <span role="alert" className="flex items-center gap-1.5 text-xs text-danger">
              <X size={13} strokeWidth={2.5} />{t.common.saveFailed}
            </span>
          ) : savedAt && (
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <Check size={13} strokeWidth={2.5} />{t.categories.saved}
            </span>
          )}
        </div>

        {rules.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-content-tertiary">
            {t.categories.noRules}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rules.map(rule => (
              <li key={rule.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content truncate">{rule.pattern}</p>
                  <p className="text-xs text-content-tertiary mt-0.5">{MATCH_TYPE_LABELS[rule.matchType]}</p>
                </div>
                <span className={`text-xs font-semibold ${CATEGORY_COLORS[rule.category]}`}>
                  {CATEGORY_LABELS[rule.category]}
                </span>
                <button onClick={() => void deleteRule(rule.id)}
                  className="text-content-tertiary hover:text-danger transition-colors flex-shrink-0"
                  title={t.categories.deleteRule} aria-label={t.categories.deleteRule}>
                  <X size={15} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Import / export */}
      <section className="bg-surface rounded-lg p-5 space-y-3">
        <h2 className="text-xs font-medium text-content-secondary">{t.categories.importExport}</h2>
        <p className="text-xs text-content-tertiary">{t.categories.importExportDesc}</p>

        <p role="status" className={`text-xs ${importMessage?.ok === false ? 'text-danger' : 'text-content-secondary'}`}>
          {importMessage?.text}
        </p>

        <div className="flex gap-2">
          <button
            onClick={exportRules}
            disabled={rules.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-hover hover:bg-surface-hover disabled:opacity-50 text-content text-sm font-medium rounded-lg transition-colors border border-line-strong"
          >
            <Download size={14} strokeWidth={2} />{t.categories.exportRules}
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-hover hover:bg-surface-hover disabled:opacity-50 text-content text-sm font-medium rounded-lg transition-colors border border-line-strong"
          >
            <Upload size={14} strokeWidth={2} />{t.categories.importRules}
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void importRules(file)
          }}
        />
      </section>

      <p className="text-xs text-content-tertiary text-center">
        {t.categories.rulesNote}
      </p>
    </div>
  )
}

// ─── Account Tab ──────────────────────────────────────────────────────────

function AccountTab() {
  const { t, language } = useLocale()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const [s, ls] = await Promise.all([getSession(), getLastSyncTime()])
      setSession(s)
      setLastSync(ls)
      setIsLoading(false)
    }
    void init()
  }, [])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    setSyncMessage(null)
    const s = await signInWithGoogle()
    setSession(s)
    setIsSigningIn(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setSession(null)
    setSyncMessage(null)
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)
    setSyncMessage(null)
    const today = getTodayDateString()
    const result = await syncAggregateForDate(today)
    setSyncMessage({ text: result.message, ok: result.ok })
    if (result.ok) {
      const ls = await getLastSyncTime()
      setLastSync(ls)
    }
    setIsSyncing(false)
  }

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso)
    const locale = language === 'zh-TW' ? 'zh-TW' : 'en-US'
    return d.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-24 rounded bg-surface-hover" /></div>
  }

  return (
    <div className="space-y-5">
      {session ? (
        <>
          {/* Logged in state */}
          <section className="bg-surface rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-medium text-content-secondary">{t.account.account}</h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent flex items-center justify-center">
                <span className="text-accent text-sm font-bold">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-content truncate">{session.user.email}</p>
                <p className="text-xs text-accent mt-0.5">{t.account.connected}</p>
              </div>
            </div>
          </section>

          {/* Sync */}
          <section className="bg-surface rounded-lg p-5 space-y-3">
            <h2 className="text-xs font-medium text-content-secondary">{t.account.dataSync}</h2>
            <p className="text-xs text-content-tertiary">
              {t.account.autoSyncNote}
            </p>
            {lastSync && (
              <p className="text-xs text-content-tertiary">
                {t.account.lastSync} <span className="text-content-secondary">{formatSyncTime(lastSync)}</span>
              </p>
            )}
            {syncMessage && (
              <p className={`text-xs ${syncMessage.ok ? 'text-accent' : 'text-danger'}`}>
                {syncMessage.text}
              </p>
            )}
            <button onClick={() => void handleSyncNow()} disabled={isSyncing}
              className="w-full py-2 bg-surface-hover hover:bg-surface-hover disabled:opacity-50 text-content text-sm font-medium rounded-lg transition-colors border border-line-strong">
              {isSyncing ? t.account.syncing : t.account.syncToday}
            </button>
          </section>

          {/* Dashboard link */}
          <section className="px-5">
            <h2 className="text-xs font-medium text-content-secondary mb-1">{t.account.webDashboard}</h2>
            <a
              href={`${DASHBOARD_URL}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 py-2 text-sm text-content-secondary hover:text-content transition-colors"
            >
              <span>{t.account.openDashboard}</span>
              <ArrowUpRight size={15} strokeWidth={2} className="text-content-tertiary" />
            </a>
          </section>

          {/* Sign out */}
          <button onClick={() => void handleSignOut()}
            className="w-full py-2 text-danger hover:text-danger/80 text-sm transition-colors">
            {t.account.signOut}
          </button>
        </>
      ) : (
        <>
          {/* Logged out state */}
          <section className="bg-surface rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-medium text-content-secondary">{t.account.connectAccount}</h2>
            <p className="text-sm text-content-secondary leading-relaxed">
              {t.account.signInDesc}
            </p>
            <div className="flex items-start gap-3 px-4 py-3 bg-surface-hover border border-line-strong rounded-lg">
              <Lock size={14} strokeWidth={1.75} className="text-content-secondary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-content-secondary leading-relaxed">
                {t.account.privacyNote}
              </p>
            </div>
            <button onClick={() => void handleSignIn()} disabled={isSigningIn}
              className="pressable flex w-full items-center justify-center gap-2 rounded-md bg-white py-2.5 text-sm font-semibold text-[#1a1d21] disabled:opacity-50">
              {isSigningIn ? (
                <>{t.account.signingIn}</>
              ) : (
                <><GoogleIcon />{t.account.signInWithGoogle}</>
              )}
            </button>
          </section>
        </>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ─── Privacy Tab ──────────────────────────────────────────────────────────

function PrivacyTab() {
  const { t } = useLocale()
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [exportRange, setExportRange] = useState<'all' | '30d'>('all')

  function getExportCutoff(): string | null {
    if (exportRange === 'all') return null
    // Storage keys are local dates — compare against a local date, not UTC.
    return getDateNDaysAgo(30)
  }

  useEffect(() => {
    const load = async () => {
      const info = await sendMessage<{ usedBytes: number; quotaBytes: number }>('GET_STORAGE_INFO')
      if (info?.data) setStorageInfo(info.data)
    }
    void load()
  }, [])

  const refreshStorageInfo = async () => {
    const info = await sendMessage<{ usedBytes: number; quotaBytes: number }>('GET_STORAGE_INFO')
    if (info?.data) setStorageInfo(info.data)
  }

  const handleExportJSON = async () => {
    setIsExporting(true)
    const data = (await sendMessage<Record<string, unknown>>('EXPORT_DATA'))?.data
    if (data) {
      const cutoff = getExportCutoff()
      const exportData = cutoff ? {
        ...data,
        entries: Object.fromEntries(
          Object.entries(data.entries as Record<string, unknown>).filter(([d]) => d >= cutoff)
        ),
        aggregates: Object.fromEntries(
          Object.entries(data.aggregates as Record<string, unknown>).filter(([d]) => d >= cutoff)
        ),
      } : data
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `echofocus-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    setIsExporting(false)
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    const data = (await sendMessage<{ aggregates: Record<string, DailyAggregate> }>('EXPORT_DATA'))?.data
    if (data?.aggregates) {
      const cutoff = getExportCutoff()
      const rows = [
        'date,totalMinutes,productiveMinutes,distractionMinutes,neutralMinutes,uncategorizedMinutes,focusScore',
        ...Object.entries(data.aggregates)
          .filter(([date]) => !cutoff || date >= cutoff)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, agg]) =>
            [
              date,
              Math.round((agg.totalSeconds ?? 0) / 60),
              Math.round((agg.productiveSeconds ?? 0) / 60),
              Math.round((agg.distractionSeconds ?? 0) / 60),
              Math.round((agg.neutralSeconds ?? 0) / 60),
              Math.round((agg.uncategorizedSeconds ?? 0) / 60),
              agg.focusScore ?? 0,
            ].join(',')
          ),
      ]
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `echofocus-aggregates-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setIsExporting(false)
  }

  const handleDeleteAll = async () => {
    setIsDeleting(true)
    const response = await sendMessage('DELETE_ALL_DATA')
    setShowDeleteConfirm(false)
    setStatusMessage(response?.success
      ? { text: t.privacy.deleted, ok: true }
      : { text: t.common.deleteFailed, ok: false })
    await refreshStorageInfo()
    setIsDeleting(false)
  }

  const usedMB = storageInfo ? (storageInfo.usedBytes / (1024 * 1024)).toFixed(2) : '…'
  const usedPercent = storageInfo ? Math.min(100, (storageInfo.usedBytes / storageInfo.quotaBytes) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Storage usage */}
      <section className="bg-surface rounded-lg p-5 space-y-3">
        <h2 className="text-xs font-medium text-content-secondary">{t.privacy.localStorage}</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-content-secondary">{t.privacy.used}</span>
            <span className="text-content tabular-nums">{usedMB} {t.privacy.storageMB}</span>
          </div>
          <div className="w-full bg-surface-hover rounded-full h-2">
            <div className="bg-accent h-2 rounded-full" style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="text-xs text-content-tertiary">{t.privacy.storageNote}</p>
        </div>
      </section>

      {/* Export */}
      <section className="bg-surface rounded-lg p-5 space-y-3">
        <h2 className="text-xs font-medium text-content-secondary">{t.privacy.exportData}</h2>
        <p className="text-xs text-content-tertiary">{t.privacy.exportDesc}</p>

        {/* Range selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-content-tertiary">{t.privacy.range}</span>
          {(['all', '30d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setExportRange(r)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                exportRange === r
                  ? 'bg-accent-subtle text-accent border-accent'
                  : 'text-content-tertiary border-line-strong hover:text-content-secondary'
              }`}
            >
              {r === 'all' ? t.privacy.allData : t.privacy.last30Days}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void handleExportJSON()}
            disabled={isExporting}
            className="flex-1 py-2 bg-surface-hover hover:bg-surface-hover disabled:opacity-50 text-content text-sm font-medium rounded-lg transition-colors border border-line-strong"
          >
            {isExporting ? t.privacy.exporting : t.privacy.exportJSON}
          </button>
          <button
            onClick={() => void handleExportCSV()}
            disabled={isExporting}
            className="flex-1 py-2 bg-surface-hover hover:bg-surface-hover disabled:opacity-50 text-content text-sm font-medium rounded-lg transition-colors border border-line-strong"
          >
            {isExporting ? t.privacy.exporting : t.privacy.exportCSV}
          </button>
        </div>
      </section>

      {/* Links */}
      <section className="px-5">
        <h2 className="text-xs font-medium text-content-secondary mb-1">{t.privacy.documents}</h2>
        {[
          { label: t.privacy.privacyPolicy, href: `${DASHBOARD_URL}/privacy` },
          { label: t.privacy.termsOfService, href: `${DASHBOARD_URL}/terms` },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            className="flex items-center justify-between text-sm text-content-secondary hover:text-content transition-colors py-2 border-b border-line last:border-0">
            <span>{label}</span>
            <ArrowUpRight size={15} strokeWidth={2} className="text-content-tertiary" />
          </a>
        ))}
      </section>

      {/* Reset zone */}
      <section className="rounded-lg p-5 space-y-3 border border-danger/30">
        <h2 className="text-xs font-medium text-danger">{t.privacy.reset}</h2>
        {statusMessage && (
          <p className={`text-xs ${statusMessage.ok ? 'text-accent' : 'text-danger'}`}>{statusMessage.text}</p>
        )}
        {!showDeleteConfirm ? (
          <>
            <p className="text-xs text-content-tertiary">{t.privacy.deleteDesc}</p>
            <button
              onClick={() => { setShowDeleteConfirm(true); setStatusMessage(null) }}
              className="w-full py-2 border border-danger/30 text-danger hover:bg-danger/10 text-sm font-medium rounded-lg transition-colors"
            >
              {t.privacy.deleteAll}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-danger font-medium">{t.privacy.deleteConfirm}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-surface-hover text-content-secondary text-sm rounded-lg transition-colors hover:bg-surface-hover"
              >
                {t.privacy.cancel}
              </button>
              <button
                onClick={() => void handleDeleteAll()}
                disabled={isDeleting}
                className="flex-1 py-2 bg-danger-deep hover:bg-danger disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {isDeleting ? t.privacy.deleting : t.privacy.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── About Tab ─────────────────────────────────────────────────────────────

function AboutTab() {
  const { t } = useLocale()
  return (
    <div className="space-y-5">
      <section className="bg-surface rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-4">
          <img src={iconSrc} alt="EchoFocus" width={48} height={48} className="rounded-lg" />
          <div>
            <h2 className="text-base font-bold tracking-tight text-content">EchoFocus</h2>
            <p className="text-xs text-content-tertiary mt-0.5">{t.about.version} {APP_VERSION}</p>
          </div>
        </div>
        <p className="text-sm text-content-secondary leading-relaxed">
          {t.about.appDesc}
        </p>
      </section>

      <section className="px-5">
        <h2 className="text-xs font-medium text-content-secondary mb-3">{t.about.privacyProtection}</h2>
        <ul className="space-y-3 border-t border-line pt-4">
          {[t.about.privacyItem0, t.about.privacyItem1, t.about.privacyItem2, t.about.privacyItem3].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-content-secondary">
              <Check size={15} strokeWidth={2.25} className="text-accent mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5">
        <h2 className="text-xs font-medium text-content-secondary mb-1">{t.about.links}</h2>
        {[
          { label: t.privacy.privacyPolicy, href: `${DASHBOARD_URL}/privacy` },
          { label: t.privacy.termsOfService, href: `${DASHBOARD_URL}/terms` },
          { label: t.about.reportIssue, href: 'https://github.com/Hank1229/EchoFocus/issues' },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            className="flex items-center justify-between text-sm text-content-secondary hover:text-content transition-colors py-2 border-b border-line last:border-0">
            <span>{label}</span>
            <ArrowUpRight size={15} strokeWidth={2} className="text-content-tertiary" />
          </a>
        ))}
      </section>

      <p className="text-xs text-content-tertiary text-center pb-2">
        {t.about.copyright}
      </p>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: t.options.tabs.general },
    { id: 'categories', label: t.options.tabs.categories },
    { id: 'privacy', label: t.options.tabs.privacy },
    { id: 'account', label: t.options.tabs.account },
    { id: 'about', label: t.options.tabs.about },
  ]

  return (
    <div className="min-h-screen bg-canvas text-content">
      <div className="max-w-xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <img src={iconSrc} alt="EchoFocus" width={36} height={36} className="rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-content">{t.options.title}</h1>
            <p className="text-xs text-content-tertiary mt-0.5">{t.options.subtitle}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-line-strong mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-content-tertiary hover:text-content-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'privacy' && <PrivacyTab />}
        {activeTab === 'account' && <AccountTab />}
        {activeTab === 'about' && <AboutTab />}
      </div>
    </div>
  )
}
