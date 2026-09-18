import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ClassificationRule } from '@echofocus/shared'
import { installChromeStub, type ChromeStub } from '../test/chrome-stub'
import { installSupabaseStub, type SupabaseStub } from '../test/supabase-stub'

vi.mock('./supabase', () => ({ getSupabaseClient: vi.fn() }))
vi.mock('./auth', () => ({ getSession: vi.fn(), refreshSession: vi.fn() }))

import { getSupabaseClient } from './supabase'
import { getSession, refreshSession } from './auth'
import { pushRules, pushSettings, reconcileWithCloud } from './prefs-sync'
import { getCustomRules, getSettings, saveCustomRules, saveSettings } from '../background/storage'

const USER = 'user-1'
const UUID_LOCAL = '11111111-1111-4111-8111-111111111111'
const UUID_CLOUD = '22222222-2222-4222-8222-222222222222'
const UUID_OTHER = '33333333-3333-4333-8333-333333333333'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let chromeStub: ChromeStub
let supabase: SupabaseStub

function signedIn(userId = USER): void {
  vi.mocked(getSession).mockResolvedValue({ user: { id: userId } } as never)
}

function rule(overrides: Partial<ClassificationRule> = {}): ClassificationRule {
  return {
    id: UUID_LOCAL,
    pattern: 'notion.so',
    matchType: 'exact',
    category: 'productive',
    isDefault: false,
    createdAt: Date.UTC(2026, 0, 1),
    ...overrides,
  }
}

function cloudRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: UUID_CLOUD,
    user_id: USER,
    pattern: 'figma.com',
    match_type: 'exact',
    category: 'productive',
    created_at: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

function cloudPrefs(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user_id: USER,
    idle_timeout_minutes: 5,
    data_retention_days: 60,
    daily_goal_minutes: 240,
    ...overrides,
  }
}

/** Mark this browser as having already met the account, skipping bootstrap. */
function alreadyBootstrapped(userId = USER): void {
  chromeStub.store.prefs_bootstrapped_user = userId
}

function patterns(rules: ClassificationRule[]): string[] {
  return rules.map((r) => r.pattern).sort()
}

function upserts(table: string): Record<string, unknown>[] {
  return supabase.requests.filter((r) => r.table === table && r.op === 'upsert').flatMap((r) => r.rows ?? [])
}

beforeEach(() => {
  vi.resetAllMocks()
  chromeStub = installChromeStub()
  supabase = installSupabaseStub()
  vi.mocked(getSupabaseClient).mockReturnValue(supabase.client)
  signedIn()
  // Several cases deliberately provoke a failure path; keep the run readable.
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('bootstrap — the browser has not met this account before', () => {
  it('keeps rules from both sides rather than letting either one win', async () => {
    await saveCustomRules([rule()])
    supabase.rows.custom_rules = [cloudRow()]

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['figma.com', 'notion.so'])
    expect((supabase.rows.custom_rules ?? []).map((r) => r.pattern).sort()).toEqual(['figma.com', 'notion.so'])
  })

  it('collapses the same pattern from both sides onto the cloud row', async () => {
    await saveCustomRules([rule({ id: UUID_LOCAL, category: 'distraction' })])
    supabase.rows.custom_rules = [cloudRow({ id: UUID_CLOUD, pattern: 'notion.so', category: 'productive' })]

    await reconcileWithCloud()

    const rules = await getCustomRules()
    expect(rules).toHaveLength(1)
    expect(rules[0].id).toBe(UUID_CLOUD)
    expect(rules[0].category).toBe('productive')
  })

  it('treats a pattern matched a different way as a separate rule', async () => {
    await saveCustomRules([rule({ pattern: 'youtube.com', matchType: 'exact' })])
    supabase.rows.custom_rules = [cloudRow({ pattern: 'youtube.com', match_type: 'path' })]

    await reconcileWithCloud()

    expect(await getCustomRules()).toHaveLength(2)
  })

  it('keeps a preference the user changed here and takes the cloud value for untouched ones', async () => {
    await saveSettings({ dailyGoalMinutes: 480 })
    supabase.rows.user_preferences = [cloudPrefs()]

    await reconcileWithCloud()

    const settings = await getSettings()
    expect(settings.dailyGoalMinutes).toBe(480)
    expect(settings.idleTimeoutMinutes).toBe(5)
    expect(settings.dataRetentionDays).toBe(60)
    expect(upserts('user_preferences')[0].daily_goal_minutes).toBe(480)
  })

  it('keeps local preferences when the account has no preferences row yet', async () => {
    await saveSettings({ dailyGoalMinutes: 480 })

    await reconcileWithCloud()

    expect((await getSettings()).dailyGoalMinutes).toBe(480)
    expect(upserts('user_preferences')[0].daily_goal_minutes).toBe(480)
  })

  it('stays unbootstrapped when the upload fails, so the next run merges again', async () => {
    await saveCustomRules([rule()])
    supabase.failing.add('custom_rules:upsert')

    await reconcileWithCloud()
    expect(chromeStub.store.prefs_bootstrapped_user).toBeUndefined()

    supabase.failing.clear()
    await reconcileWithCloud()

    expect(chromeStub.store.prefs_bootstrapped_user).toBe(USER)
    expect((supabase.rows.custom_rules ?? []).map((r) => r.pattern)).toEqual(['notion.so'])
  })

  it('runs again after signing into a different account', async () => {
    alreadyBootstrapped('someone-else')
    await saveCustomRules([rule()])
    supabase.rows.custom_rules = [cloudRow()]

    await reconcileWithCloud()

    expect(chromeStub.store.prefs_bootstrapped_user).toBe(USER)
    expect(patterns(await getCustomRules())).toEqual(['figma.com', 'notion.so'])
  })

  it('changes nothing locally when the cloud is unreachable', async () => {
    await saveCustomRules([rule()])
    supabase.failing.add('custom_rules')

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['notion.so'])
    expect(chromeStub.store.prefs_bootstrapped_user).toBeUndefined()
  })
})

describe('reconcile — the cloud is authoritative', () => {
  beforeEach(() => {
    alreadyBootstrapped()
  })

  it('drops a user rule the cloud no longer has', async () => {
    await saveCustomRules([rule()])
    supabase.rows.custom_rules = [cloudRow()]

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['figma.com'])
  })

  it('pulls rules newest-first, because precedence is array order', async () => {
    supabase.rows.custom_rules = [
      cloudRow({ id: UUID_CLOUD, pattern: 'oldest.example', created_at: '2026-01-01T00:00:00.000Z' }),
      cloudRow({ id: UUID_OTHER, pattern: 'newest.example', created_at: '2026-03-01T00:00:00.000Z' }),
    ]

    await reconcileWithCloud()

    expect((await getCustomRules()).map((r) => r.pattern)).toEqual(['newest.example', 'oldest.example'])
  })

  it('leaves built-in rules alone, since they have no cloud row', async () => {
    await saveCustomRules([rule({ id: UUID_OTHER, pattern: 'github.com', isDefault: true }), rule()])
    supabase.rows.custom_rules = [cloudRow()]

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['figma.com', 'github.com'])
  })

  it('applies cloud preferences over the local ones', async () => {
    await saveSettings({ dailyGoalMinutes: 480, idleTimeoutMinutes: 10 })
    supabase.rows.user_preferences = [cloudPrefs()]

    await reconcileWithCloud()

    const settings = await getSettings()
    expect(settings.dailyGoalMinutes).toBe(240)
    expect(settings.idleTimeoutMinutes).toBe(5)
    expect(chromeStub.idleDetectionIntervalSeconds).toBe(300)
  })

  it('never pulls the tracking switch, which is per-browser', async () => {
    await saveSettings({ trackingEnabled: false })
    supabase.rows.user_preferences = [cloudPrefs()]

    await reconcileWithCloud()

    expect((await getSettings()).trackingEnabled).toBe(false)
  })

  it('keeps the rules it has when the fetch fails', async () => {
    await saveCustomRules([rule()])
    supabase.failing.add('custom_rules')

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['notion.so'])
  })

  it('skips a malformed cloud row and keeps the rest', async () => {
    supabase.rows.custom_rules = [cloudRow(), cloudRow({ id: UUID_OTHER, pattern: '', match_type: 'nonsense' })]

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['figma.com'])
  })

  it('ignores a malformed preferences row instead of resetting the user', async () => {
    await saveSettings({ dailyGoalMinutes: 480 })
    supabase.rows.user_preferences = [cloudPrefs({ daily_goal_minutes: -1 })]

    await reconcileWithCloud()

    expect((await getSettings()).dailyGoalMinutes).toBe(480)
  })

  it('does nothing at all when signed out', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    await saveCustomRules([rule()])
    supabase.rows.custom_rules = [cloudRow()]

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['notion.so'])
    expect(supabase.requests).toEqual([])
  })
})

describe('pushing a local edit', () => {
  beforeEach(() => {
    alreadyBootstrapped()
  })

  it('uploads the rules and clears the pending mark', async () => {
    await saveCustomRules([rule()])

    await pushRules()

    expect((supabase.rows.custom_rules ?? []).map((r) => r.pattern)).toEqual(['notion.so'])
    expect(chromeStub.store.pending_prefs_push).toEqual([])
  })

  it('sends the column names the table actually uses', async () => {
    await saveCustomRules([rule()])

    await pushRules()

    expect(upserts('custom_rules')[0]).toMatchObject({
      id: UUID_LOCAL,
      user_id: USER,
      pattern: 'notion.so',
      match_type: 'exact',
      category: 'productive',
      created_at: '2026-01-01T00:00:00.000Z',
    })
  })

  it('deletes cloud rules the user removed here', async () => {
    supabase.rows.custom_rules = [cloudRow(), cloudRow({ id: UUID_OTHER, pattern: 'stale.example' })]
    await saveCustomRules([rule({ id: UUID_CLOUD, pattern: 'figma.com' })])

    await pushRules()

    expect((supabase.rows.custom_rules ?? []).map((r) => r.pattern)).toEqual(['figma.com'])
  })

  it('clears every cloud rule when the last local rule is deleted', async () => {
    supabase.rows.custom_rules = [cloudRow()]
    await saveCustomRules([])

    await pushRules()

    expect(supabase.rows.custom_rules).toEqual([])
    expect(upserts('custom_rules')).toEqual([])
  })

  it('does not upload built-in rules', async () => {
    await saveCustomRules([rule({ id: UUID_OTHER, pattern: 'github.com', isDefault: true }), rule()])

    await pushRules()

    expect((supabase.rows.custom_rules ?? []).map((r) => r.pattern)).toEqual(['notion.so'])
  })

  it('mints a real uuid for a legacy rule id and keeps it locally', async () => {
    await saveCustomRules([rule({ id: 'rule-1739' })])

    await pushRules()

    const [saved] = await getCustomRules()
    expect(saved.id).toMatch(UUID)
    expect((supabase.rows.custom_rules ?? [])[0].id).toBe(saved.id)
  })

  it('never sends the tracking switch to the cloud', async () => {
    await saveSettings({ trackingEnabled: false })

    await pushSettings()

    const row = upserts('user_preferences')[0]
    expect(row).not.toHaveProperty('trackingEnabled')
    expect(row).not.toHaveProperty('tracking_enabled')
  })

  it('stays pending after a failed push and is retried before the next pull', async () => {
    await saveCustomRules([rule()])
    supabase.failing.add('custom_rules:upsert')

    await pushRules()
    expect(chromeStub.store.pending_prefs_push).toEqual(['rules'])

    // The cloud is still empty; adopting it here would silently delete the rule.
    await reconcileWithCloud()
    expect(patterns(await getCustomRules())).toEqual(['notion.so'])

    supabase.failing.clear()
    await reconcileWithCloud()

    expect(chromeStub.store.pending_prefs_push).toEqual([])
    expect((supabase.rows.custom_rules ?? []).map((r) => r.pattern)).toEqual(['notion.so'])
  })

  it('tracks rules and preferences as separate pending kinds', async () => {
    supabase.failing.add('custom_rules:upsert')
    await saveCustomRules([rule()])

    await pushRules()
    await pushSettings()

    expect(chromeStub.store.pending_prefs_push).toEqual(['rules'])
  })

  it('does not upload anything while signed out', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    await saveCustomRules([rule()])

    await pushRules()

    expect(supabase.requests).toEqual([])
    expect(chromeStub.store.pending_prefs_push).toEqual(['rules'])
  })
})

describe('an access token that expired while the worker was asleep', () => {
  beforeEach(() => {
    alreadyBootstrapped()
  })

  it('refreshes once and replays the request', async () => {
    supabase.statuses = [401]
    supabase.rows.custom_rules = [cloudRow()]
    vi.mocked(refreshSession).mockResolvedValue({ user: { id: USER } } as never)

    await reconcileWithCloud()

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(patterns(await getCustomRules())).toEqual(['figma.com'])
  })

  it('gives up without touching local data when the refresh fails', async () => {
    supabase.statuses = [401]
    supabase.rows.custom_rules = [cloudRow()]
    await saveCustomRules([rule()])
    vi.mocked(refreshSession).mockResolvedValue(null)

    await reconcileWithCloud()

    expect(patterns(await getCustomRules())).toEqual(['notion.so'])
  })
})
