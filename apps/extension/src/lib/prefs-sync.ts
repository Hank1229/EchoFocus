import { z } from 'zod'
import type { ClassificationRule, Settings } from '@echofocus/shared'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import { getSupabaseClient } from './supabase'
import { getSession, refreshSession } from './auth'
import { categorySchema, themePreferenceSchema, type ThemePreference } from './schemas'
import { getCustomRules, saveCustomRules, getSettings, withStorageLock } from '../background/storage'
import { applySettings } from '../background/settings'
import { getPomodoroSettings, POMODORO_SETTINGS_KEY, POMODORO_REMINDERS_KEY } from '../background/pomodoro'
import { getStoredTheme, THEME_KEY } from './theme'

// Classification rules and preferences are the one slice of state the cloud
// owns: the web editor and every browser the user signs into have to agree on
// them, so once a device has met an account the cloud value wins. Browsing
// entries, URLs and page titles are never involved — nothing here reads them.
//
// trackingEnabled is deliberately absent from both directions. It is a
// per-browser on/off switch, not a preference: syncing it would let the user
// pausing tracking on a work laptop silently stop it at home.

type SyncedSettings = Pick<Settings, 'idleTimeoutMinutes' | 'dataRetentionDays' | 'dailyGoalMinutes'>

// Theme and pomodoro preferences live in their own storage keys (the Settings
// schema strips unknown fields), but ride the same user_preferences row.
interface SyncedExtras {
  theme: ThemePreference
  focusMinutes: number
  breakMinutes: number
  remindersEnabled: boolean
}

const EXTRAS_DEFAULTS: SyncedExtras = { theme: 'system', focusMinutes: 25, breakMinutes: 5, remindersEnabled: true }

type Pushable = 'rules' | 'settings'

const PENDING_PUSH_KEY = 'pending_prefs_push'
const BOOTSTRAPPED_USER_KEY = 'prefs_bootstrapped_user'

// Set once a pull has seen the migration-008 columns on the cloud row. Until
// then uploads send only the original columns, so an extension shipped ahead
// of the remote migration cannot break the whole settings sync.
const CLOUD_EXTRAS_KEY = 'cloud_prefs_v2'
const LAST_RECONCILE_KEY = 'last_prefs_reconcile_at'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Request Plumbing ──────────────────────────────────────────────────────

interface QueryResult<T> {
  data: T | null
  error: { message: string } | null
  status: number
}

// supabase-js loads its access token when the service worker wakes and rarely
// lives long enough to run its own refresh timer, so a stored token can be
// hours expired while still looking valid. Refresh once and replay, the same
// way lib/ai.ts does. The query is a factory because a PostgREST builder
// fires a fresh request every time it's awaited.
async function run<T>(query: () => PromiseLike<QueryResult<T>>): Promise<{ ok: boolean; data: T | null }> {
  try {
    let result = await query()
    if (result.status === 401) {
      if (!await refreshSession()) return { ok: false, data: null }
      result = await query()
    }
    if (result.error) {
      console.error('[EchoFocus] Preference sync error:', result.error.message)
      return { ok: false, data: null }
    }
    return { ok: true, data: result.data }
  } catch (err) {
    console.error('[EchoFocus] Preference sync request failed:', err)
    return { ok: false, data: null }
  }
}

// ─── Pending Push Queue ────────────────────────────────────────────────────

// A local edit is marked here before it goes out and stays marked until the
// cloud has confirmed it. Reconcile pushes a marked kind before pulling, so a
// push that failed days ago can never be reverted by the stale cloud copy.

async function pendingPushes(): Promise<Pushable[]> {
  const result = await chrome.storage.local.get(PENDING_PUSH_KEY)
  const raw = result[PENDING_PUSH_KEY]
  if (!Array.isArray(raw)) return []
  return raw.filter((kind): kind is Pushable => kind === 'rules' || kind === 'settings')
}

async function markPending(kind: Pushable): Promise<void> {
  await withStorageLock(async () => {
    const pending = await pendingPushes()
    if (!pending.includes(kind)) {
      await chrome.storage.local.set({ [PENDING_PUSH_KEY]: [...pending, kind] })
    }
  })
}

async function clearPending(kind: Pushable): Promise<void> {
  await withStorageLock(async () => {
    const pending = await pendingPushes()
    await chrome.storage.local.set({ [PENDING_PUSH_KEY]: pending.filter((k) => k !== kind) })
  })
}

// ─── Rules ─────────────────────────────────────────────────────────────────

const cloudRuleSchema = z.object({
  id: z.string(),
  pattern: z.string().min(1),
  match_type: z.enum(['exact', 'wildcard', 'path']),
  category: categorySchema,
  created_at: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
})

function ruleRow(rule: ClassificationRule, userId: string): Record<string, unknown> {
  return {
    id: rule.id,
    user_id: userId,
    pattern: rule.pattern,
    match_type: rule.matchType,
    category: rule.category,
    created_at: new Date(rule.createdAt).toISOString(),
  }
}

// Cloud rows are only ever user rules — built-in defaults have no row.
function localRule(row: z.infer<typeof cloudRuleSchema>): ClassificationRule {
  return {
    id: row.id,
    pattern: row.pattern,
    matchType: row.match_type,
    category: row.category,
    isDefault: false,
    createdAt: Date.parse(row.created_at),
  }
}

// Skip the rows that don't parse rather than failing the whole pull — one bad
// row must not cost the user every rule they have.
function cloudRules(rows: unknown[]): ClassificationRule[] {
  const rules: ClassificationRule[] = []
  for (const row of rows) {
    const parsed = cloudRuleSchema.safeParse(row)
    if (parsed.success) rules.push(localRule(parsed.data))
    else console.warn('[EchoFocus] Skipping malformed cloud rule:', parsed.error.message)
  }
  return rules
}

// custom_rules.id is a uuid column and a cloud row's id IS the local rule's id,
// so a single malformed id would fail every push from here on. Mint a real one
// and keep it locally.
async function canonicalRules(): Promise<ClassificationRule[]> {
  const rules = await getCustomRules()
  if (rules.every((rule) => UUID.test(rule.id))) return rules

  const canonical = rules.map((rule) => (UUID.test(rule.id) ? rule : { ...rule, id: crypto.randomUUID() }))
  await saveCustomRules(canonical)
  return canonical
}

async function fetchCloudRules(userId: string): Promise<ClassificationRule[] | null> {
  const supabase = getSupabaseClient()
  const result = await run<unknown[]>(() =>
    supabase
      .from('custom_rules')
      .select('id, pattern, match_type, category, created_at')
      .eq('user_id', userId)
      // Rule precedence IS array order — first match wins — and both editors
      // prepend new rules. Without this the cloud hands them back in whatever
      // order Postgres felt like, silently reshuffling precedence on every pull.
      .order('created_at', { ascending: false }),
  )
  return result.ok ? cloudRules(result.data ?? []) : null
}

async function uploadRules(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const rules = (await canonicalRules()).filter((rule) => !rule.isDefault)
  const ids = rules.map((rule) => rule.id)

  if (rules.length > 0) {
    const upserted = await run(() =>
      supabase
        .from('custom_rules')
        .upsert(rules.map((rule) => ruleRow(rule, userId)), { onConflict: 'id' }),
    )
    if (!upserted.ok) return false
  }

  // Rules the user deleted here have to disappear from the cloud too, or the
  // next pull hands them straight back.
  const pruned = await run(() => {
    const stale = supabase.from('custom_rules').delete().eq('user_id', userId)
    return ids.length > 0 ? stale.not('id', 'in', `(${ids.join(',')})`) : stale
  })
  if (!pruned.ok) return false

  await clearPending('rules')
  return true
}

// Cloud wins for user rules. Built-in defaults exist only on the device, so
// they pass through untouched.
async function adoptRules(userRules: ClassificationRule[]): Promise<void> {
  await withStorageLock(async () => {
    const builtIn = (await getCustomRules()).filter((rule) => rule.isDefault)
    await saveCustomRules([...builtIn, ...userRules])
  })
}

async function pullRules(userId: string): Promise<void> {
  const cloud = await fetchCloudRules(userId)
  if (cloud) await adoptRules(cloud)
}

// ─── Settings ──────────────────────────────────────────────────────────────

const cloudSettingsSchema = z.object({
  idle_timeout_minutes: z.number().positive(),
  data_retention_days: z.number().positive(),
  daily_goal_minutes: z.number().positive(),
  // Absent until migration 008 reaches the remote project.
  theme: themePreferenceSchema.optional().catch(undefined),
  pomodoro_focus_minutes: z.number().positive().optional().catch(undefined),
  pomodoro_break_minutes: z.number().positive().optional().catch(undefined),
  pomodoro_reminders_enabled: z.boolean().optional().catch(undefined),
})

async function localExtras(): Promise<SyncedExtras> {
  const [theme, pomodoro, stored] = await Promise.all([
    getStoredTheme(),
    getPomodoroSettings(),
    chrome.storage.local.get(POMODORO_REMINDERS_KEY),
  ])
  return {
    theme,
    focusMinutes: pomodoro.focusMinutes,
    breakMinutes: pomodoro.breakMinutes,
    remindersEnabled: stored[POMODORO_REMINDERS_KEY] !== false,
  }
}

async function adoptExtras(extras: Partial<SyncedExtras>): Promise<void> {
  const writes: Record<string, unknown> = {}
  if (extras.theme !== undefined) writes[THEME_KEY] = extras.theme
  if (extras.focusMinutes !== undefined && extras.breakMinutes !== undefined) {
    writes[POMODORO_SETTINGS_KEY] = { focusMinutes: extras.focusMinutes, breakMinutes: extras.breakMinutes }
  }
  if (extras.remindersEnabled !== undefined) writes[POMODORO_REMINDERS_KEY] = extras.remindersEnabled
  if (Object.keys(writes).length > 0) await chrome.storage.local.set(writes)
}

async function cloudSupportsExtras(): Promise<boolean> {
  const stored = await chrome.storage.local.get(CLOUD_EXTRAS_KEY)
  return stored[CLOUD_EXTRAS_KEY] === true
}

// `value: null` means the account has no preferences row yet, which is a very
// different thing from the request having failed.
async function fetchCloudSettings(userId: string): Promise<{
  ok: boolean
  value: SyncedSettings | null
  extras: Partial<SyncedExtras> | null
}> {
  const supabase = getSupabaseClient()
  // select('*') rather than named columns: the same build must work against a
  // cloud row with and without the 008 columns.
  const result = await run<unknown>(() =>
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  )
  if (!result.ok) return { ok: false, value: null, extras: null }
  if (result.data === null) return { ok: true, value: null, extras: null }

  if (typeof result.data === 'object' && 'theme' in result.data) {
    await chrome.storage.local.set({ [CLOUD_EXTRAS_KEY]: true })
  }

  const parsed = cloudSettingsSchema.safeParse(result.data)
  if (!parsed.success) {
    console.warn('[EchoFocus] Ignoring malformed cloud preferences:', parsed.error.message)
    return { ok: true, value: null, extras: null }
  }
  return {
    ok: true,
    value: {
      idleTimeoutMinutes: parsed.data.idle_timeout_minutes,
      dataRetentionDays: parsed.data.data_retention_days,
      dailyGoalMinutes: parsed.data.daily_goal_minutes,
    },
    extras: {
      theme: parsed.data.theme,
      focusMinutes: parsed.data.pomodoro_focus_minutes,
      breakMinutes: parsed.data.pomodoro_break_minutes,
      remindersEnabled: parsed.data.pomodoro_reminders_enabled,
    },
  }
}

async function uploadSettings(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const settings = await getSettings()
  const extras = await localExtras()
  const withExtras = await cloudSupportsExtras()

  const pushed = await run(() =>
    supabase.from('user_preferences').upsert({
      user_id: userId,
      idle_timeout_minutes: settings.idleTimeoutMinutes,
      data_retention_days: settings.dataRetentionDays,
      daily_goal_minutes: settings.dailyGoalMinutes,
      ...(withExtras
        ? {
            theme: extras.theme,
            pomodoro_focus_minutes: extras.focusMinutes,
            pomodoro_break_minutes: extras.breakMinutes,
            pomodoro_reminders_enabled: extras.remindersEnabled,
          }
        : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }),
  )
  if (!pushed.ok) return false

  await clearPending('settings')
  return true
}

async function pullSettings(userId: string): Promise<void> {
  const cloud = await fetchCloudSettings(userId)
  // SyncedSettings can't carry trackingEnabled, so applySettings can never be
  // handed the master switch from here.
  if (cloud.value) await applySettings(cloud.value)
  if (cloud.extras) await adoptExtras(cloud.extras)
}

// ─── First Contact ─────────────────────────────────────────────────────────

// Keyed by user id so signing into a different account bootstraps again.
async function unbootstrapped(userId: string): Promise<boolean> {
  const result = await chrome.storage.local.get(BOOTSTRAPPED_USER_KEY)
  return result[BOOTSTRAPPED_USER_KEY] !== userId
}

// Union, cloud wins. A device that has never synced must not lose the rules it
// already had to an untouched account, and a fresh install must not push its
// blank slate over rules another device uploaded. The same pattern from both
// sides collapses onto the cloud's row so the id agrees everywhere.
function mergeRules(local: ClassificationRule[], cloud: ClassificationRule[]): ClassificationRule[] {
  const merged = new Map(local.map((rule) => [`${rule.matchType}:${rule.pattern}`, rule]))
  for (const rule of cloud) merged.set(`${rule.matchType}:${rule.pattern}`, rule)
  return [...merged.values()]
}

// A field the user changed on this device is the only intent we can be sure
// of, so it wins; a field still sitting at its default yields to the cloud.
function mergeSettings(local: Settings, cloud: SyncedSettings | null): SyncedSettings {
  const pick = <K extends keyof SyncedSettings>(key: K): number =>
    local[key] !== DEFAULT_SETTINGS[key] || !cloud ? local[key] : cloud[key]

  return {
    idleTimeoutMinutes: pick('idleTimeoutMinutes'),
    dataRetentionDays: pick('dataRetentionDays'),
    dailyGoalMinutes: pick('dailyGoalMinutes'),
  }
}

// Same rule as mergeSettings, field by field: a local value moved off its
// default is user intent and wins; otherwise the cloud's (when it has one).
function mergeExtras(local: SyncedExtras, cloud: Partial<SyncedExtras> | null): SyncedExtras {
  const pick = <K extends keyof SyncedExtras>(key: K): SyncedExtras[K] => {
    if (local[key] !== EXTRAS_DEFAULTS[key] || !cloud) return local[key]
    return (cloud[key] ?? local[key]) as SyncedExtras[K]
  }
  return {
    theme: pick('theme'),
    focusMinutes: pick('focusMinutes'),
    breakMinutes: pick('breakMinutes'),
    remindersEnabled: pick('remindersEnabled'),
  }
}

// The one pass where the cloud is not authoritative: neither side has ever
// seen the other, so an empty cloud means "nothing uploaded yet", not "the
// user deleted everything". Merge both ways, push the result, and only then
// mark this browser as bootstrapped — a failed push leaves the marker unset so
// the next reconcile merges again, which is idempotent.
async function bootstrap(userId: string): Promise<void> {
  const cloudRuleList = await fetchCloudRules(userId)
  if (!cloudRuleList) return

  const cloudPrefs = await fetchCloudSettings(userId)
  if (!cloudPrefs.ok) return

  const local = await getCustomRules()
  await adoptRules(mergeRules(local.filter((rule) => !rule.isDefault), cloudRuleList))
  await applySettings(mergeSettings(await getSettings(), cloudPrefs.value))
  await adoptExtras(mergeExtras(await localExtras(), cloudPrefs.extras))

  const rulesUp = await uploadRules(userId)
  const settingsUp = await uploadSettings(userId)
  if (rulesUp && settingsUp) {
    await chrome.storage.local.set({ [BOOTSTRAPPED_USER_KEY]: userId })
  }
}

// ─── Entry Points ──────────────────────────────────────────────────────────

// Called straight after the options page's edit has been stored locally. The
// local write already happened, so a failed upload costs nothing but a delay:
// the kind stays pending and the next reconcile retries it before trusting the
// cloud copy.
export async function pushRules(): Promise<void> {
  await markPending('rules')
  await flush('rules')
}

export async function pushSettings(): Promise<void> {
  await markPending('settings')
  await flush('settings')
}

async function flush(kind: Pushable): Promise<void> {
  try {
    const session = await getSession()
    if (!session) return

    const userId = session.user.id
    if (await unbootstrapped(userId)) {
      await bootstrap(userId)
    } else if (kind === 'rules') {
      await uploadRules(userId)
    } else {
      await uploadSettings(userId)
    }
  } catch (err) {
    console.error('[EchoFocus] Preference push failed:', err)
  }
}

// The one place local and cloud preferences are brought back in line. Runs on
// the nightly sync, on browser startup, and behind the manual "Sync now"
// button. Signed out it does nothing at all — local rules and settings are the
// user's data and stay exactly as they are.
// Popup opens call this: fresh dashboard edits (pomodoro durations, theme)
// should be live by the time the user starts a round, without hammering the
// cloud on every open. The timestamp is written before the reconcile so two
// near-simultaneous opens can't both fire.
export async function reconcileIfStale(minIntervalMs = 60_000): Promise<void> {
  const stored = await chrome.storage.local.get(LAST_RECONCILE_KEY)
  const last = stored[LAST_RECONCILE_KEY]
  if (typeof last === 'number' && Date.now() - last < minIntervalMs) return
  await chrome.storage.local.set({ [LAST_RECONCILE_KEY]: Date.now() })
  await reconcileWithCloud()
}

export async function reconcileWithCloud(): Promise<void> {
  try {
    const session = await getSession()
    if (!session) return

    const userId = session.user.id
    if (await unbootstrapped(userId)) {
      await bootstrap(userId)
      return
    }

    const pending = await pendingPushes()

    if (!pending.includes('rules') || await uploadRules(userId)) {
      await pullRules(userId)
    }
    if (!pending.includes('settings') || await uploadSettings(userId)) {
      await pullSettings(userId)
    }
  } catch (err) {
    console.error('[EchoFocus] Preference reconcile failed:', err)
  }
}
