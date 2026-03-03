import React, { useEffect, useState, useCallback } from 'react'
import { Lock } from 'lucide-react'
import iconSrc from '../assets/icon-32.png'
import type { Settings, ClassificationRule, Category, MatchType, DailyAggregate } from '@echofocus/shared'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import type { Session } from '@supabase/supabase-js'
import { signInWithGoogle, signOut, getSession } from '../lib/auth'
import { syncAggregateForDate, getLastSyncTime } from '../lib/sync'
import { getTodayDateString } from '@echofocus/shared'
import { useLocale, type Language } from '../lib/i18n'

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? 'http://localhost:3000'
const APP_VERSION = '1.0.0'

// ─── Helpers ──────────────────────────────────────────────────────────────

async function sendMessage<T>(type: string, payload?: unknown): Promise<T | null> {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload })
    if (response?.success) return response.data as T
    return null
  } catch {
    return null
  }
}

type Tab = 'general' | 'categories' | 'privacy' | 'account' | 'about'

const CATEGORY_COLORS: Record<Category, string> = {
  productive: 'text-green-400',
  distraction: 'text-red-400',
  neutral: 'text-slate-400',
  uncategorized: 'text-slate-500',
}

// ─── General Tab ──────────────────────────────────────────────────────────

function GeneralTab() {
  const { t, language, setLanguage } = useLocale()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const loaded = await sendMessage<Settings>('GET_SETTINGS')
      if (loaded) setSettings(loaded)
      setIsLoading(false)
    }
    void load()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await sendMessage('SAVE_SETTINGS', settings)
    setIsSaving(false)
    setSavedAt(Date.now())
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSavedAt(null)
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <section className="bg-slate-800 rounded-xl p-5 space-y-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.general.tracking}</h2>

        {/* trackingEnabled */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">{t.general.enableTracking}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.general.enableTrackingDesc}</p>
          </div>
          <button
            onClick={() => update('trackingEnabled', !settings.trackingEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${settings.trackingEnabled ? 'bg-green-500' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${settings.trackingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* idleTimeoutMinutes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-slate-200">{t.general.idleTimeout}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.general.idleTimeoutDesc}</p>
            </div>
            <span className="text-sm font-semibold text-green-400 tabular-nums">{settings.idleTimeoutMinutes} {t.general.min}</span>
          </div>
          <input type="range" min={1} max={30} value={settings.idleTimeoutMinutes}
            onChange={e => update('idleTimeoutMinutes', Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-slate-600 mt-1"><span>{t.general.range1Min}</span><span>{t.general.range30Min}</span></div>
        </div>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.general.goalsAndData}</h2>

        {/* dailyGoalMinutes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-slate-200">{t.general.dailyFocusGoal}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.general.dailyFocusGoalDesc}</p>
            </div>
            <span className="text-sm font-semibold text-green-400 tabular-nums">
              {Math.floor(settings.dailyGoalMinutes / 60)}h{settings.dailyGoalMinutes % 60 > 0 ? ` ${settings.dailyGoalMinutes % 60}m` : ''}
            </span>
          </div>
          <input type="range" min={60} max={720} step={30} value={settings.dailyGoalMinutes}
            onChange={e => update('dailyGoalMinutes', Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-slate-600 mt-1"><span>{t.general.range1hr}</span><span>{t.general.range12hr}</span></div>
        </div>

        {/* dataRetentionDays */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-slate-200">{t.general.dataRetention}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.general.dataRetentionDesc}</p>
            </div>
            <span className="text-sm font-semibold text-green-400 tabular-nums">{settings.dataRetentionDays} {t.general.day}</span>
          </div>
          <input type="range" min={7} max={365} step={7} value={settings.dataRetentionDays}
            onChange={e => update('dataRetentionDays', Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-slate-600 mt-1"><span>{t.general.range7d}</span><span>{t.general.range365d}</span></div>
        </div>
      </section>

      {/* Language setting */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.general.language}</h2>
        <p className="text-xs text-slate-500">{t.general.languageDesc}</p>
        <div className="flex gap-2">
          {(['en', 'zh-TW'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                language === lang
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {lang === 'en' ? t.general.english : t.general.traditionalChinese}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between pt-1">
        {savedAt ? <span className="text-xs text-green-400">{t.general.saved}</span> : <span />}
        <button onClick={handleSave} disabled={isSaving}
          className="px-5 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
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

  // New rule form state
  const [newPattern, setNewPattern] = useState('')
  const [newMatchType, setNewMatchType] = useState<MatchType>('exact')
  const [newCategory, setNewCategory] = useState<Category>('productive')

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
    setRules(loaded ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const saveRules = async (updated: ClassificationRule[]) => {
    setIsSaving(true)
    await sendMessage('SAVE_CUSTOM_RULES', updated)
    setIsSaving(false)
    setSavedAt(Date.now())
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
    await saveRules(updated)
    setNewPattern('')
    setSavedAt(Date.now())
  }

  const deleteRule = async (id: string) => {
    const updated = rules.filter(r => r.id !== id)
    setRules(updated)
    await saveRules(updated)
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      {/* Add rule form */}
      <section className="bg-slate-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t.categories.addCustomRule}</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={newPattern}
            onChange={e => setNewPattern(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void addRule() }}
            placeholder={t.categories.patternPlaceholder}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-500"
          />
          <div className="flex gap-2">
            <select value={newMatchType} onChange={e => setNewMatchType(e.target.value as MatchType)}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-green-500">
              {(Object.entries(MATCH_TYPE_LABELS) as [MatchType, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-green-500">
              {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <button onClick={() => void addRule()} disabled={!newPattern.trim() || isSaving}
            className="w-full py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
            {t.categories.addRule}
          </button>
        </div>
      </section>

      {/* Rule list */}
      <section className="bg-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t.categories.customRules} ({rules.length})
          </h2>
          {savedAt && <span className="text-xs text-green-400">{t.categories.saved}</span>}
        </div>

        {rules.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            {t.categories.noRules}
          </div>
        ) : (
          <ul className="divide-y divide-slate-700">
            {rules.map(rule => (
              <li key={rule.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{rule.pattern}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{MATCH_TYPE_LABELS[rule.matchType]}</p>
                </div>
                <span className={`text-xs font-semibold ${CATEGORY_COLORS[rule.category]}`}>
                  {CATEGORY_LABELS[rule.category]}
                </span>
                <button onClick={() => void deleteRule(rule.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                  title={t.categories.deleteRule}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-600 text-center">
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
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      {session ? (
        <>
          {/* Logged in state */}
          <section className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.account.account}</h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <span className="text-green-400 text-sm font-bold">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{session.user.email}</p>
                <p className="text-xs text-green-400 mt-0.5">{t.account.connected}</p>
              </div>
            </div>
          </section>

          {/* Sync */}
          <section className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.account.dataSync}</h2>
            <p className="text-xs text-slate-500">
              {t.account.autoSyncNote}
            </p>
            {lastSync && (
              <p className="text-xs text-slate-500">
                {t.account.lastSync} <span className="text-slate-400">{formatSyncTime(lastSync)}</span>
              </p>
            )}
            {syncMessage && (
              <p className={`text-xs ${syncMessage.ok ? 'text-green-400' : 'text-red-400'}`}>
                {syncMessage.text}
              </p>
            )}
            <button onClick={() => void handleSyncNow()} disabled={isSyncing}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-600">
              {isSyncing ? t.account.syncing : t.account.syncToday}
            </button>
          </section>

          {/* Dashboard link */}
          <section className="bg-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t.account.webDashboard}</h2>
            <a
              href={`${DASHBOARD_URL}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm font-medium rounded-lg transition-colors"
            >
              {t.account.openDashboard}
            </a>
          </section>

          {/* Sign out */}
          <button onClick={() => void handleSignOut()}
            className="w-full py-2 text-red-400 hover:text-red-300 text-sm transition-colors">
            {t.account.signOut}
          </button>
        </>
      ) : (
        <>
          {/* Logged out state */}
          <section className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.account.connectAccount}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t.account.signInDesc}
            </p>
            <div className="flex items-start gap-3 px-4 py-3 bg-slate-700/50 border border-slate-700 rounded-lg">
              <Lock size={14} strokeWidth={1.75} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.account.privacyNote}
              </p>
            </div>
            <button onClick={() => void handleSignIn()} disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 text-sm font-semibold rounded-lg transition-colors">
              {isSigningIn ? (
                <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />{t.account.signingIn}</>
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
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }

  useEffect(() => {
    const load = async () => {
      const info = await sendMessage<{ usedBytes: number; quotaBytes: number }>('GET_STORAGE_INFO')
      if (info) setStorageInfo(info)
    }
    void load()
  }, [])

  const refreshStorageInfo = async () => {
    const info = await sendMessage<{ usedBytes: number; quotaBytes: number }>('GET_STORAGE_INFO')
    if (info) setStorageInfo(info)
  }

  const handleExportJSON = async () => {
    setIsExporting(true)
    const data = await sendMessage<Record<string, unknown>>('EXPORT_DATA')
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
    const data = await sendMessage<{ aggregates: Record<string, DailyAggregate> }>('EXPORT_DATA')
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
    await sendMessage('DELETE_ALL_DATA')
    setShowDeleteConfirm(false)
    setStatusMessage({ text: t.privacy.deleted, ok: true })
    await refreshStorageInfo()
    setIsDeleting(false)
  }

  const usedMB = storageInfo ? (storageInfo.usedBytes / (1024 * 1024)).toFixed(2) : '…'
  const usedPercent = storageInfo ? Math.min(100, (storageInfo.usedBytes / storageInfo.quotaBytes) * 100) : 0

  const DASHBOARD_URL_LOCAL = import.meta.env.VITE_DASHBOARD_URL ?? 'http://localhost:3000'

  return (
    <div className="space-y-5">
      {/* Storage usage */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.privacy.localStorage}</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{t.privacy.used}</span>
            <span className="text-slate-200 tabular-nums">{usedMB} {t.privacy.storageMB}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{t.privacy.storageNote}</p>
        </div>
      </section>

      {/* Export */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.privacy.exportData}</h2>
        <p className="text-xs text-slate-500">{t.privacy.exportDesc}</p>

        {/* Range selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{t.privacy.range}</span>
          {(['all', '30d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setExportRange(r)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                exportRange === r
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'text-slate-500 border-slate-700 hover:text-slate-300'
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
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-600"
          >
            {isExporting ? t.privacy.exporting : t.privacy.exportJSON}
          </button>
          <button
            onClick={() => void handleExportCSV()}
            disabled={isExporting}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-600"
          >
            {isExporting ? t.privacy.exporting : t.privacy.exportCSV}
          </button>
        </div>
      </section>

      {/* Links */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-1">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t.privacy.documents}</h2>
        {[
          { label: t.privacy.privacyPolicy, href: `${DASHBOARD_URL_LOCAL}/privacy` },
          { label: t.privacy.termsOfService, href: `${DASHBOARD_URL_LOCAL}/terms` },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            className="flex items-center justify-between text-sm text-slate-300 hover:text-white transition-colors py-2 border-b border-slate-700 last:border-0">
            <span>{label}</span>
            <span className="text-slate-500">↗</span>
          </a>
        ))}
      </section>

      {/* Reset zone */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-3 border border-red-900/40">
        <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider">{t.privacy.reset}</h2>
        {statusMessage && (
          <p className={`text-xs ${statusMessage.ok ? 'text-green-400' : 'text-red-400'}`}>{statusMessage.text}</p>
        )}
        {!showDeleteConfirm ? (
          <>
            <p className="text-xs text-slate-500">{t.privacy.deleteDesc}</p>
            <button
              onClick={() => { setShowDeleteConfirm(true); setStatusMessage(null) }}
              className="w-full py-2 border border-red-800 text-red-400 hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors"
            >
              {t.privacy.deleteAll}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400 font-medium">{t.privacy.deleteConfirm}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors hover:bg-slate-600"
              >
                {t.privacy.cancel}
              </button>
              <button
                onClick={() => void handleDeleteAll()}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
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
  const DASHBOARD_URL_LOCAL = import.meta.env.VITE_DASHBOARD_URL ?? 'http://localhost:3000'

  return (
    <div className="space-y-5">
      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <img src={iconSrc} alt="EchoFocus" width={48} height={48} className="rounded-xl" />
          <div>
            <h2 className="text-base font-bold text-slate-100">EchoFocus</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.about.version} {APP_VERSION}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          {t.about.appDesc}
        </p>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t.about.privacyProtection}</h2>
        <ul className="space-y-2.5">
          {[t.about.privacyItem0, t.about.privacyItem1, t.about.privacyItem2, t.about.privacyItem3].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-1">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t.about.links}</h2>
        {[
          { label: t.privacy.privacyPolicy, href: `${DASHBOARD_URL_LOCAL}/privacy` },
          { label: t.privacy.termsOfService, href: `${DASHBOARD_URL_LOCAL}/terms` },
          { label: t.about.reportIssue, href: 'https://github.com/Hank1229/EchoFocus/issues' },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            className="flex items-center justify-between text-sm text-slate-300 hover:text-white transition-colors py-2 border-b border-slate-700 last:border-0">
            <span>{label}</span>
            <span className="text-slate-500">↗</span>
          </a>
        ))}
      </section>

      <p className="text-xs text-slate-600 text-center pb-2">
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
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <img src={iconSrc} alt="EchoFocus" width={36} height={36} className="rounded-xl" />
          <div>
            <h1 className="text-xl font-bold text-slate-100">{t.options.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.options.subtitle}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-700 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
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
