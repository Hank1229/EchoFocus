import React, { useEffect, useState, useCallback } from 'react'
import type { Settings, ClassificationRule, Category, MatchType, DailyAggregate } from '@echofocus/shared'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import type { Session } from '@supabase/supabase-js'
import { signInWithGoogle, signOut, getSession } from '../lib/auth'
import { syncAggregateForDate, getLastSyncTime } from '../lib/sync'
import { getTodayDateString } from '@echofocus/shared'

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

const CATEGORY_LABELS: Record<Category, string> = {
  productive: '生產力',
  distraction: '分心',
  neutral: '中性',
  uncategorized: '未分類',
}

const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  exact: '完整網域',
  wildcard: '萬用字元',
  path: '路徑',
}

const CATEGORY_COLORS: Record<Category, string> = {
  productive: 'text-green-400',
  distraction: 'text-red-400',
  neutral: 'text-slate-400',
  uncategorized: 'text-slate-500',
}

// ─── General Tab ──────────────────────────────────────────────────────────

function GeneralTab() {
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
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">追蹤設定</h2>

        {/* trackingEnabled */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">啟用追蹤</p>
            <p className="text-xs text-slate-500 mt-0.5">開啟後自動記錄瀏覽時間</p>
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
              <p className="text-sm font-medium text-slate-200">閒置逾時</p>
              <p className="text-xs text-slate-500 mt-0.5">無操作超過此時間後暫停追蹤</p>
            </div>
            <span className="text-sm font-semibold text-green-400 tabular-nums">{settings.idleTimeoutMinutes} 分鐘</span>
          </div>
          <input type="range" min={1} max={30} value={settings.idleTimeoutMinutes}
            onChange={e => update('idleTimeoutMinutes', Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-slate-600 mt-1"><span>1 分</span><span>30 分</span></div>
        </div>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">目標與資料</h2>

        {/* dailyGoalMinutes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-slate-200">每日專注目標</p>
              <p className="text-xs text-slate-500 mt-0.5">每天希望達到的生產力時間</p>
            </div>
            <span className="text-sm font-semibold text-green-400 tabular-nums">
              {Math.floor(settings.dailyGoalMinutes / 60)} 小時{settings.dailyGoalMinutes % 60 > 0 ? ` ${settings.dailyGoalMinutes % 60} 分` : ''}
            </span>
          </div>
          <input type="range" min={60} max={720} step={30} value={settings.dailyGoalMinutes}
            onChange={e => update('dailyGoalMinutes', Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-slate-600 mt-1"><span>1 小時</span><span>12 小時</span></div>
        </div>

        {/* dataRetentionDays */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <p className="text-sm font-medium text-slate-200">資料保留天數</p>
              <p className="text-xs text-slate-500 mt-0.5">超過此天數的原始記錄將自動清除</p>
            </div>
            <span className="text-sm font-semibold text-green-400 tabular-nums">{settings.dataRetentionDays} 天</span>
          </div>
          <input type="range" min={7} max={365} step={7} value={settings.dataRetentionDays}
            onChange={e => update('dataRetentionDays', Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-slate-600 mt-1"><span>7 天</span><span>365 天</span></div>
        </div>
      </section>

      <div className="flex items-center justify-between pt-1">
        {savedAt ? <span className="text-xs text-green-400">✓ 已儲存</span> : <span />}
        <button onClick={handleSave} disabled={isSaving}
          className="px-5 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
          {isSaving ? '儲存中…' : '儲存設定'}
        </button>
      </div>
    </div>
  )
}

// ─── Categories Tab ───────────────────────────────────────────────────────

function CategoriesTab() {
  const [rules, setRules] = useState<ClassificationRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // New rule form state
  const [newPattern, setNewPattern] = useState('')
  const [newMatchType, setNewMatchType] = useState<MatchType>('exact')
  const [newCategory, setNewCategory] = useState<Category>('productive')

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
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">新增自訂規則</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={newPattern}
            onChange={e => setNewPattern(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void addRule() }}
            placeholder="例：notion.so 或 *.google.com"
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
            新增規則
          </button>
        </div>
      </section>

      {/* Rule list */}
      <section className="bg-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            自訂規則 ({rules.length})
          </h2>
          {savedAt && <span className="text-xs text-green-400">✓ 已儲存</span>}
        </div>

        {rules.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            尚無自訂規則。新增規則可覆蓋預設分類。
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
                  title="刪除規則">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-600 text-center">
        自訂規則優先於預設分類。變更即時生效。
      </p>
    </div>
  )
}

// ─── Account Tab ──────────────────────────────────────────────────────────

function AccountTab() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
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
    setSyncMessage(result.message)
    if (result.ok) {
      const ls = await getLastSyncTime()
      setLastSync(ls)
    }
    setIsSyncing(false)
  }

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">帳戶資訊</h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <span className="text-green-400 text-sm font-bold">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{session.user.email}</p>
                <p className="text-xs text-green-400 mt-0.5">已連線</p>
              </div>
            </div>
          </section>

          {/* Sync */}
          <section className="bg-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">資料同步</h2>
            <p className="text-xs text-slate-500">
              每日 00:05 自動同步至雲端 Dashboard。
              僅同步匿名聚合統計，原始瀏覽紀錄永遠留在您的裝置。
            </p>
            {lastSync && (
              <p className="text-xs text-slate-500">
                上次同步：<span className="text-slate-400">{formatSyncTime(lastSync)}</span>
              </p>
            )}
            {syncMessage && (
              <p className={`text-xs ${syncMessage.includes('已同步') ? 'text-green-400' : 'text-red-400'}`}>
                {syncMessage}
              </p>
            )}
            <button onClick={() => void handleSyncNow()} disabled={isSyncing}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-600">
              {isSyncing ? '同步中…' : '立即同步今日資料'}
            </button>
          </section>

          {/* Dashboard link */}
          <section className="bg-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">網頁 Dashboard</h2>
            <a
              href={`${DASHBOARD_URL}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-sm font-medium rounded-lg transition-colors"
            >
              開啟 Dashboard ↗
            </a>
          </section>

          {/* Sign out */}
          <button onClick={() => void handleSignOut()}
            className="w-full py-2 text-red-400 hover:text-red-300 text-sm transition-colors">
            登出
          </button>
        </>
      ) : (
        <>
          {/* Logged out state */}
          <section className="bg-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">連接帳戶</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              登入後可將每日生產力統計同步至網頁 Dashboard，並跨裝置查看趨勢分析。
            </p>
            <div className="flex items-start gap-3 px-4 py-3 bg-slate-700/50 border border-slate-700 rounded-lg">
              <span className="text-base mt-0.5">🔒</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                僅同步匿名聚合數據（網域名稱＋時長）。原始 URL 與瀏覽紀錄永遠不會離開您的裝置。
              </p>
            </div>
            <button onClick={() => void handleSignIn()} disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 text-sm font-semibold rounded-lg transition-colors">
              {isSigningIn ? (
                <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />登入中…</>
              ) : (
                <><GoogleIcon />使用 Google 帳戶登入</>
              )}
            </button>
          </section>

          <p className="text-xs text-slate-600 text-center">
            需要先在 Supabase 設定 Google OAuth 和<br />
            將 chromiumapp.org 加入重定向白名單
          </p>
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
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number } | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; ok: boolean } | null>(null)

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
    const data = await sendMessage<object>('EXPORT_DATA')
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
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
      const rows = [
        'date,totalMinutes,productiveMinutes,distractionMinutes,neutralMinutes,uncategorizedMinutes,focusScore',
        ...Object.entries(data.aggregates)
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
    setStatusMessage({ text: '✓ 所有追蹤資料已刪除', ok: true })
    await refreshStorageInfo()
    setIsDeleting(false)
  }

  const usedMB = storageInfo ? (storageInfo.usedBytes / (1024 * 1024)).toFixed(2) : '…'
  const usedPercent = storageInfo ? Math.min(100, (storageInfo.usedBytes / storageInfo.quotaBytes) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Storage usage */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">本地儲存空間</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">已使用</span>
            <span className="text-slate-200 tabular-nums">{usedMB} MB / 10 MB</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">所有資料儲存於您的裝置，絕不上傳至任何伺服器</p>
        </div>
      </section>

      {/* Export */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">匯出資料</h2>
        <p className="text-xs text-slate-500">下載您所有的瀏覽記錄與聚合統計</p>
        <div className="flex gap-2">
          <button
            onClick={() => void handleExportJSON()}
            disabled={isExporting}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-600"
          >
            {isExporting ? '匯出中…' : '匯出 JSON'}
          </button>
          <button
            onClick={() => void handleExportCSV()}
            disabled={isExporting}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-600"
          >
            {isExporting ? '匯出中…' : '匯出 CSV'}
          </button>
        </div>
      </section>

      {/* Links */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-1">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">相關文件</h2>
        {[
          { label: '隱私政策', href: `${DASHBOARD_URL}/privacy` },
          { label: '服務條款', href: `${DASHBOARD_URL}/terms` },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            className="flex items-center justify-between text-sm text-slate-300 hover:text-white transition-colors py-2 border-b border-slate-700 last:border-0">
            <span>{label}</span>
            <span className="text-slate-500">↗</span>
          </a>
        ))}
      </section>

      {/* Danger zone */}
      <section className="bg-slate-800 rounded-xl p-5 space-y-3 border border-red-900/40">
        <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider">危險區域</h2>
        {statusMessage && (
          <p className={`text-xs ${statusMessage.ok ? 'text-green-400' : 'text-red-400'}`}>{statusMessage.text}</p>
        )}
        {!showDeleteConfirm ? (
          <>
            <p className="text-xs text-slate-500">刪除所有追蹤記錄，包含每日統計與 AI 分析（設定與帳戶資料將保留）</p>
            <button
              onClick={() => { setShowDeleteConfirm(true); setStatusMessage(null) }}
              className="w-full py-2 border border-red-800 text-red-400 hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors"
            >
              刪除所有追蹤資料
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400 font-medium">確定要刪除所有追蹤資料？此操作無法復原。</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors hover:bg-slate-600"
              >
                取消
              </button>
              <button
                onClick={() => void handleDeleteAll()}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {isDeleting ? '刪除中…' : '確認刪除'}
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
  return (
    <div className="space-y-5">
      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🎯</span>
          <div>
            <h2 className="text-base font-bold text-slate-100">EchoFocus</h2>
            <p className="text-xs text-slate-500 mt-0.5">版本 {APP_VERSION}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          AI 驅動的隱私優先生產力追蹤工具。自動記錄瀏覽行為，用 Gemini AI 分析工作模式，並提供個人化的改善建議。
        </p>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">我們如何保護您的隱私</h2>
        <ul className="space-y-2.5">
          {[
            '所有瀏覽記錄僅儲存於您的裝置（chrome.storage.local）',
            'AI 分析只使用匿名聚合數據（網域名稱＋時長，無完整 URL）',
            '原始 URL 與頁面標題永遠不會離開您的設備',
            '帳戶資料使用 Supabase 安全加密儲存',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-1">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">連結</h2>
        {[
          { label: '隱私政策', href: `${DASHBOARD_URL}/privacy` },
          { label: '服務條款', href: `${DASHBOARD_URL}/terms` },
          { label: '回報問題 / 意見回饋', href: 'https://github.com/anthropics/claude-code/issues' },
        ].map(({ label, href }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer"
            className="flex items-center justify-between text-sm text-slate-300 hover:text-white transition-colors py-2 border-b border-slate-700 last:border-0">
            <span>{label}</span>
            <span className="text-slate-500">↗</span>
          </a>
        ))}
      </section>

      <p className="text-xs text-slate-600 text-center pb-2">
        © 2025 EchoFocus — Powered by Google Gemini AI
      </p>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: '一般' },
    { id: 'categories', label: '類別' },
    { id: 'privacy', label: '隱私' },
    { id: 'account', label: '帳戶' },
    { id: 'about', label: '關於' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">🎯</span>
          <div>
            <h1 className="text-xl font-bold text-slate-100">EchoFocus 設定</h1>
            <p className="text-xs text-slate-500 mt-0.5">所有資料僅儲存於您的裝置</p>
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
