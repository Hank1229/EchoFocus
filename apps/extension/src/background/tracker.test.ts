import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { TrackingEntry, DailyAggregate, TrackingState } from '@echofocus/shared'
import { DEFAULT_SETTINGS } from '@echofocus/shared'
import { installChromeStub, type ChromeStub, type StubTab } from '../test/chrome-stub'

// tracker.ts keeps its session in module-level state, so every test gets a
// fresh module instance. Storage state lives in the chrome stub, which is
// re-installed per test.
type Tracker = typeof import('./tracker')

let chromeStub: ChromeStub

const BASE = new Date(2026, 2, 14, 10, 0, 0).getTime() // 2026-03-14 10:00 local

async function loadTracker(): Promise<Tracker> {
  vi.resetModules()
  return import('./tracker')
}

function at(ms: number): void {
  vi.setSystemTime(new Date(ms))
}

// Move the clock the way a RUNNING service worker experiences it: the
// 1-minute heartbeat alarm keeps proving the machine is awake. A bare at()
// jump models a machine that slept through the gap, which is exactly what the
// session end-time clamp exists to catch — so any test expecting the full
// elapsed time to be credited has to beat along with the clock.
function awake(ms: number): void {
  at(ms)
  chromeStub.store['last_seen_at'] = ms
}

function asTab(partial: Partial<StubTab>): chrome.tabs.Tab {
  return partial as unknown as chrome.tabs.Tab
}

function entriesOn(date: string): TrackingEntry[] {
  return (chromeStub.store[`entries:${date}`] as TrackingEntry[] | undefined) ?? []
}

function allEntries(): TrackingEntry[] {
  return Object.keys(chromeStub.store)
    .filter((key) => key.startsWith('entries:'))
    .sort()
    .flatMap((key) => chromeStub.store[key] as TrackingEntry[])
}

function storedState(): TrackingState {
  return chromeStub.store['tracking_state'] as TrackingState
}

function aggregateOn(date: string): DailyAggregate | undefined {
  return chromeStub.store[`aggregates:${date}`] as DailyAggregate | undefined
}

/** Put a single active tab in the focused window. */
function setActiveTab(url: string, title = 'page', extra: Partial<StubTab> = {}): StubTab {
  const tab: StubTab = { id: 1, windowId: 1, active: true, url, title, ...extra }
  chromeStub.tabs = [tab]
  return tab
}

beforeEach(() => {
  chromeStub = installChromeStub()
  vi.useFakeTimers({ toFake: ['Date'] })
  at(BASE)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('duration attribution', () => {
  it('credits exactly the elapsed time to the domain that was open', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://www.github.com/echofocus/repo', 'EchoFocus')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(BASE + 600_000) // 10 minutes later
    chromeStub.tabs.push({ id: 2, windowId: 1, active: true, url: 'https://example.org/', title: 'x' })
    await tracker.handleTabActivated({ tabId: 2, windowId: 1 })

    const entries = entriesOn('2026-03-14')
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      domain: 'github.com', // www. stripped by shared extractDomain
      category: 'productive', // from shared categorizeDomain defaults
      duration: 600,
      startTime: BASE,
      date: '2026-03-14',
      url: 'https://www.github.com/echofocus/repo',
      title: 'EchoFocus',
    })
  })

  it('truncates sub-second remainders instead of rounding up', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 10_900)
    await tracker.handleWindowFocusChanged(-1)
    expect(entriesOn('2026-03-14')[0].duration).toBe(10)
  })

  it('drops a visit shorter than the 5 second minimum', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 4_999)
    await tracker.handleWindowFocusChanged(-1)
    expect(allEntries()).toEqual([])
  })

  it('keeps a visit that reaches exactly the 5 second minimum', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 5_000)
    await tracker.handleWindowFocusChanged(-1)
    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(5)
  })

  it('refreshes the day aggregate whenever an entry is saved', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    awake(BASE + 120_000)
    await tracker.handleWindowFocusChanged(-1)

    expect(aggregateOn('2026-03-14')).toMatchObject({
      date: '2026-03-14',
      totalSeconds: 120,
      productiveSeconds: 120,
      focusScore: 100,
    })
  })

  it('clears the persisted session so a restart cannot resurrect it', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 60_000)
    await tracker.handleWindowFocusChanged(-1)

    expect(storedState().sessionStartTime).toBeNull()
    expect(storedState().activeDomain).toBeNull()
  })

  it('caps a marathon session at 4 hours instead of writing a 9 hour entry', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://youtube.com/watch', 'video', { audible: true })
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(BASE + 9 * 60 * 60 * 1000)
    await tracker.handleIdleStateChanged('locked')

    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(4 * 60 * 60)
  })
})

describe('domain extraction and categorization', () => {
  it('delegates categorization to shared defaults', async () => {
    const cases: Array<[string, string, string]> = [
      ['https://docs.github.com/en/rest', 'docs.github.com', 'productive'],
      ['https://www.youtube.com/feed', 'youtube.com', 'distraction'],
      ['https://en.wikipedia.org/wiki/Focus', 'en.wikipedia.org', 'neutral'],
      ['https://some-unknown-site.test/page', 'some-unknown-site.test', 'uncategorized'],
    ]

    for (const [url, domain, category] of cases) {
      chromeStub = installChromeStub()
      const tracker = await loadTracker()
      setActiveTab(url)
      await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
      at(BASE + 30_000)
      await tracker.handleWindowFocusChanged(-1)

      const saved = allEntries()[0]
      expect(saved.domain).toBe(domain)
      expect(saved.category).toBe(category)
      at(BASE)
    }
  })

  it('applies stored custom rules ahead of the defaults', async () => {
    chromeStub.store['custom_rules'] = [
      {
        id: 'r1',
        pattern: '*.internal.test',
        matchType: 'wildcard',
        category: 'productive',
        isDefault: false,
        createdAt: BASE,
      },
      {
        id: 'r2',
        pattern: 'github.com',
        matchType: 'exact',
        category: 'distraction',
        isDefault: false,
        createdAt: BASE,
      },
    ]
    const tracker = await loadTracker()

    setActiveTab('https://wiki.internal.test/home')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 30_000)
    await tracker.handleWindowFocusChanged(-1)
    expect(allEntries()[0]).toMatchObject({ domain: 'wiki.internal.test', category: 'productive' })

    // A custom rule overrides the shared default category for github.com
    at(BASE + 60_000)
    await tracker.handleWindowFocusChanged(1)
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 120_000)
    await tracker.handleWindowFocusChanged(-1)
    expect(allEntries()[1]).toMatchObject({ domain: 'github.com', category: 'distraction' })
  })

  // Path rules are the only kind that needs more than the hostname, so they are
  // also the only kind a domain-only classifier drops on the floor.
  it('applies a path rule to one section of a site without moving the rest', async () => {
    chromeStub.store['custom_rules'] = [
      {
        id: 'r1',
        pattern: 'youtube.com/playlist',
        matchType: 'path',
        category: 'productive',
        isDefault: false,
        createdAt: BASE,
      },
    ]
    const tracker = await loadTracker()

    setActiveTab('https://www.youtube.com/playlist?list=WL')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 30_000)
    await tracker.handleWindowFocusChanged(-1)
    expect(allEntries()[0]).toMatchObject({ domain: 'youtube.com', category: 'productive' })

    at(BASE + 60_000)
    await tracker.handleWindowFocusChanged(1)
    setActiveTab('https://www.youtube.com/watch?v=abc')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 120_000)
    await tracker.handleWindowFocusChanged(-1)
    expect(allEntries()[1]).toMatchObject({ domain: 'youtube.com', category: 'distraction' })
  })

  it('starts no session for a URL with no extractable domain', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
  })
})

describe('untrackable pages', () => {
  const untrackable = [
    'chrome://settings',
    'chrome-extension://abc/popup.html',
    'edge://favorites',
    'about:blank',
    'devtools://devtools/inspector.html',
    'file:///Users/me/notes.txt',
    'view-source:https://github.com/',
  ]

  it('never starts a session on a browser-internal or local page', async () => {
    for (const url of untrackable) {
      chromeStub = installChromeStub()
      const tracker = await loadTracker()
      setActiveTab(url)
      await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
      expect(tracker.getCurrentSessionInfo().domain, url).toBeNull()
    }
  })

  it('ends and clears a live session when the user lands on one', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 60_000)
    await tracker.handleTabUpdated(
      1,
      { url: 'chrome://settings' },
      asTab({ id: 1, windowId: 1, active: true, url: 'chrome://settings' }),
    )

    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(60)
    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
    expect(storedState().sessionStartTime).toBeNull()
  })
})

describe('midnight split', () => {
  it('splits a session that crosses local midnight across both days', async () => {
    const start = new Date(2026, 2, 14, 23, 50, 0).getTime()
    at(start)
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(new Date(2026, 2, 15, 0, 10, 0).getTime()) // 20 minutes later, next day
    await tracker.handleWindowFocusChanged(-1)

    const before = entriesOn('2026-03-14')
    const after = entriesOn('2026-03-15')
    expect(before).toHaveLength(1)
    expect(after).toHaveLength(1)
    expect(before[0].duration).toBe(600)
    expect(after[0].duration).toBe(600)
    expect(after[0].startTime).toBe(new Date(2026, 2, 15, 0, 0, 0).getTime())
    // Derived part ids must be distinct so neither overwrites the other
    expect(after[0].id).toBe(`${before[0].id}-2`)
  })

  it('refreshes the aggregate of EVERY day the session touched', async () => {
    at(new Date(2026, 2, 14, 23, 50, 0).getTime())
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(new Date(2026, 2, 15, 0, 10, 0).getTime())
    await tracker.handleWindowFocusChanged(-1)

    expect(aggregateOn('2026-03-14')?.totalSeconds).toBe(600)
    expect(aggregateOn('2026-03-15')?.totalSeconds).toBe(600)
  })

  it('keeps a session inside one day as a single entry', async () => {
    at(new Date(2026, 2, 14, 23, 50, 0).getTime())
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(new Date(2026, 2, 14, 23, 55, 0).getTime())
    await tracker.handleWindowFocusChanged(-1)

    expect(allEntries()).toHaveLength(1)
    expect(entriesOn('2026-03-15')).toEqual([])
  })
})

describe('idle and lock transitions', () => {
  it('pauses tracking on idle and banks the time so far', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(BASE + 300_000)
    await tracker.handleIdleStateChanged('idle')

    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(300)
    expect(tracker.getInMemoryState().isIdle).toBe(true)
    expect(storedState().sessionStartTime).toBeNull()
  })

  it('starts no new session while the user is idle', async () => {
    const tracker = await loadTracker()
    await tracker.handleIdleStateChanged('idle')

    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 600_000)
    await tracker.handleWindowFocusChanged(-1)

    expect(allEntries()).toEqual([])
  })

  it('keeps an audible tab tracking through idle', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://youtube.com/watch', 'video', { audible: true })
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 300_000)
    await tracker.handleIdleStateChanged('idle')

    expect(allEntries()).toEqual([])
    expect(tracker.getCurrentSessionInfo().domain).toBe('youtube.com')
    expect(tracker.getInMemoryState().isIdle).toBe(false)
  })

  it('ignores audio when a different tab is the audible one', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    // The active tab is now a different tab than the tracked session
    chromeStub.tabs = [{ id: 5, windowId: 1, active: true, url: 'https://youtube.com/', audible: true }]

    at(BASE + 300_000)
    await tracker.handleIdleStateChanged('idle')

    expect(allEntries()).toHaveLength(1)
    expect(tracker.getInMemoryState().isIdle).toBe(true)
  })

  it('ends the session on lock even when audio is playing', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://youtube.com/watch', 'video', { audible: true })
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(BASE + 300_000)
    await tracker.handleIdleStateChanged('locked')

    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(300)
    expect(tracker.getInMemoryState().isIdle).toBe(true)
  })

  it('resumes the active tab when the user comes back', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 300_000)
    await tracker.handleIdleStateChanged('idle')

    at(BASE + 600_000)
    await tracker.handleIdleStateChanged('active')

    expect(tracker.getInMemoryState().isIdle).toBe(false)
    expect(tracker.getCurrentSessionInfo().domain).toBe('github.com')
    expect(tracker.getInMemoryState().sessionStartTime).toBe(BASE + 600_000)
  })

  it('does NOT restart a session that survived idle (audible tab keeps its start time)', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://youtube.com/watch', 'video', { audible: true })
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 300_000)
    await tracker.handleIdleStateChanged('idle')
    at(BASE + 600_000)
    await tracker.handleIdleStateChanged('active')

    // Restarting here would silently discard the 10 minutes already watched
    expect(tracker.getInMemoryState().sessionStartTime).toBe(BASE)
    expect(tracker.getCurrentSessionInfo().elapsedSeconds).toBe(600)
  })

  it('starts no session on "active" while every Chrome window is unfocused', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleWindowFocusChanged(-1) // WINDOW_ID_NONE

    await tracker.handleIdleStateChanged('idle')
    at(BASE + 600_000)
    await tracker.handleIdleStateChanged('active')

    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
  })
})

describe('window focus', () => {
  it('ends the session when all Chrome windows lose focus', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 90_000)
    await tracker.handleWindowFocusChanged(-1)

    expect(allEntries()).toHaveLength(1)
    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
  })

  it('starts tracking the active tab of the newly focused window', async () => {
    const tracker = await loadTracker()
    chromeStub.tabs = [
      { id: 1, windowId: 1, active: true, url: 'https://github.com/' },
      { id: 2, windowId: 2, active: true, url: 'https://youtube.com/' },
    ]
    await tracker.handleWindowFocusChanged(2)
    expect(tracker.getCurrentSessionInfo().domain).toBe('youtube.com')
  })

  it('ignores tab activations from a window that is not focused', async () => {
    const tracker = await loadTracker()
    chromeStub.tabs = [
      { id: 1, windowId: 1, active: true, url: 'https://github.com/' },
      { id: 2, windowId: 2, active: true, url: 'https://youtube.com/' },
    ]
    await tracker.handleWindowFocusChanged(1)

    at(BASE + 10_000)
    await tracker.handleTabActivated({ tabId: 2, windowId: 2 })

    // Still on the focused window's tab — the background window cannot hijack it
    expect(tracker.getCurrentSessionInfo().domain).toBe('github.com')
    expect(allEntries()).toEqual([])
  })
})

describe('handleTabUpdated', () => {
  it('keeps the running session when only the title changes', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/', 'old title')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 30_000)
    await tracker.handleTabUpdated(
      1,
      { title: 'new title' },
      asTab({ id: 1, windowId: 1, active: true, url: 'https://github.com/', title: 'new title' }),
    )

    expect(allEntries()).toEqual([])
    expect(tracker.getInMemoryState().sessionStartTime).toBe(BASE)
    expect(tracker.getInMemoryState().activeTitle).toBe('new title')
  })

  it('ends the old session and starts a new one when the URL changes', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 45_000)
    await tracker.handleTabUpdated(
      1,
      { url: 'https://www.youtube.com/watch' },
      asTab({ id: 1, windowId: 1, active: true, url: 'https://www.youtube.com/watch', title: 'v' }),
    )

    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0]).toMatchObject({ domain: 'github.com', duration: 45 })
    expect(tracker.getCurrentSessionInfo()).toMatchObject({
      domain: 'youtube.com',
      category: 'distraction',
      elapsedSeconds: 0,
    })
  })

  it('ignores updates for a tab that is not active', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 45_000)
    await tracker.handleTabUpdated(
      2,
      { url: 'https://youtube.com/' },
      asTab({ id: 2, windowId: 1, active: false, url: 'https://youtube.com/' }),
    )

    expect(allEntries()).toEqual([])
    expect(tracker.getCurrentSessionInfo().domain).toBe('github.com')
  })

  it('ignores change events that carry neither a URL nor a title', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 45_000)
    await tracker.handleTabUpdated(
      1,
      { status: 'complete' },
      asTab({ id: 1, windowId: 1, active: true, url: 'https://github.com/' }),
    )

    expect(tracker.getInMemoryState().sessionStartTime).toBe(BASE)
  })
})

describe('restoreState', () => {
  function persistDangling(sessionStartTime: number): void {
    chromeStub.store['tracking_state'] = {
      isTracking: true,
      isIdle: false,
      activeTabId: 1,
      activeDomain: 'github.com',
      activeUrl: 'https://github.com/',
      activeTitle: 'GitHub',
      activeCategory: 'productive',
      sessionStartTime,
    } satisfies TrackingState
  }

  it('credits a dangling session only up to lastSeenAt + the 90s grace window', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 300_000 // SW last proved alive at +5 min
    at(BASE + 10 * 60 * 60 * 1000) // machine slept for hours

    const tracker = await loadTracker()
    await tracker.restoreState()

    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(300 + 90)
  })

  it('never credits more than 4 hours when no heartbeat exists', async () => {
    persistDangling(BASE)
    at(BASE + 10 * 60 * 60 * 1000)

    const tracker = await loadTracker()
    await tracker.restoreState()

    expect(allEntries()[0].duration).toBe(4 * 60 * 60)
  })

  // A gap within the grace window means the worker was cycled out from under a
  // user who never stopped reading. Ending the session there would be
  // permanent — no tab, window or idle event fires while someone stays put.
  it('keeps the session running when the worker merely cycled', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 60_000
    at(BASE + 70_000)
    setActiveTab('https://github.com/')

    const tracker = await loadTracker()
    await tracker.restoreState()

    expect(allEntries()).toEqual([])
    expect(tracker.getCurrentSessionInfo()).toMatchObject({
      domain: 'github.com',
      elapsedSeconds: 70, // still counting from the ORIGINAL start
    })
    expect(storedState().sessionStartTime).toBe(BASE)
  })

  it('keeps counting across repeated worker cycles instead of restarting', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 60_000
    setActiveTab('https://github.com/')

    for (const now of [BASE + 70_000, BASE + 130_000, BASE + 190_000]) {
      at(now)
      const tracker = await loadTracker()
      await tracker.restoreState()
      expect(tracker.getCurrentSessionInfo().elapsedSeconds).toBe((now - BASE) / 1000)
      // restoreState refreshes the heartbeat, so the next wake is a short gap too
    }

    expect(allEntries()).toEqual([])
  })

  it('drops a dangling session below the minimum duration', async () => {
    // No heartbeat at all (first wake after an update) — the session is
    // finalized at `now`, and 3 seconds is not worth an entry.
    persistDangling(BASE)
    at(BASE + 3_000)

    const tracker = await loadTracker()
    await tracker.restoreState()

    expect(allEntries()).toEqual([])
  })

  it('consumes the persisted session so a second restore cannot double count', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 300_000
    at(BASE + 400_000)

    const first = await loadTracker()
    await first.restoreState()
    expect(allEntries()).toHaveLength(1)

    // A fresh service-worker lifetime reading the same storage
    const second = await loadTracker()
    await second.restoreState()
    expect(allEntries()).toHaveLength(1)
  })

  it('is idempotent within one service-worker lifetime', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 300_000
    at(BASE + 400_000)

    const tracker = await loadTracker()
    await tracker.restoreState()
    await tracker.restoreState()

    expect(allEntries()).toHaveLength(1)
  })

  it('takes isTracking from settings, not from the persisted mirror', async () => {
    chromeStub.store['tracking_state'] = {
      isTracking: true,
      isIdle: false,
      activeTabId: null,
      activeDomain: null,
      activeUrl: null,
      activeTitle: null,
      activeCategory: null,
      sessionStartTime: null,
    } satisfies TrackingState
    chromeStub.store['settings'] = { ...DEFAULT_SETTINGS, trackingEnabled: false }

    const tracker = await loadTracker()
    await tracker.restoreState()

    expect(tracker.getInMemoryState().isTracking).toBe(false)
  })

  it('saves nothing when there was no live session', async () => {
    const tracker = await loadTracker()
    await tracker.restoreState()
    expect(allEntries()).toEqual([])
  })

  it('refreshes the heartbeat after restoring', async () => {
    at(BASE + 1_000)
    const tracker = await loadTracker()
    await tracker.restoreState()
    expect(chromeStub.store['last_seen_at']).toBe(BASE + 1_000)
  })

  it('resumes on the tab in front after a long gap, starting from now', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 300_000
    at(BASE + 10 * 60 * 60 * 1000) // machine slept overnight
    setActiveTab('https://stackoverflow.com/questions/1')

    const tracker = await loadTracker()
    await tracker.restoreState()

    // The slept-through hours go to nobody: the old session is banked at the
    // heartbeat, the new one starts at wake-up.
    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0]).toMatchObject({ domain: 'github.com', duration: 390 })
    expect(tracker.getCurrentSessionInfo()).toMatchObject({
      domain: 'stackoverflow.com',
      elapsedSeconds: 0,
    })
    expect(storedState().sessionStartTime).toBe(BASE + 10 * 60 * 60 * 1000)
  })

  it('does not resume while Chrome sits in the background', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 300_000
    at(BASE + 10 * 60 * 60 * 1000)
    setActiveTab('https://stackoverflow.com/questions/1')
    chromeStub.lastFocusedWindow = { id: 1, focused: false }

    const tracker = await loadTracker()
    await tracker.restoreState()

    // A session started here would accrue time no tab event can ever end —
    // they all bail while another app has focus.
    expect(allEntries()).toHaveLength(1)
    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
    expect(storedState().sessionStartTime).toBeNull()
  })

  it('does not resume onto a browser-internal page', async () => {
    persistDangling(BASE)
    chromeStub.store['last_seen_at'] = BASE + 300_000
    at(BASE + 10 * 60 * 60 * 1000)
    setActiveTab('chrome://settings')

    const tracker = await loadTracker()
    await tracker.restoreState()

    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
  })

  it('does not resume while tracking is switched off', async () => {
    persistDangling(BASE)
    chromeStub.store['settings'] = { ...DEFAULT_SETTINGS, trackingEnabled: false }
    chromeStub.store['last_seen_at'] = BASE + 300_000
    at(BASE + 10 * 60 * 60 * 1000)
    setActiveTab('https://stackoverflow.com/questions/1')

    const tracker = await loadTracker()
    await tracker.restoreState()

    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
  })

  it('treats an unfocused last window as "not focused" for resume decisions', async () => {
    chromeStub.lastFocusedWindow = { id: 1, focused: false }
    setActiveTab('https://github.com/')

    const tracker = await loadTracker()
    await tracker.restoreState()
    await tracker.applyTrackingEnabled(true)

    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
  })
})

// The service worker can outlive a machine sleep — an open popup holds a port
// that keeps it alive — so restoreState never runs and the stale heartbeat is
// the only evidence the user was gone.
describe('a machine that slept without killing the worker', () => {
  it('banks only up to the last heartbeat, not the wall clock', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 6 * 60 * 60 * 1000) // lid closed for six hours
    await tracker.handleWindowFocusChanged(-1)

    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(90) // heartbeat at session start + grace
  })

  it('still caps a genuinely long session at 4 hours', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://youtube.com/watch', 'video', { audible: true })
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(BASE + 9 * 60 * 60 * 1000)
    await tracker.handleWindowFocusChanged(-1)

    expect(allEntries()[0].duration).toBe(4 * 60 * 60)
  })
})

describe('recordHeartbeat', () => {
  it('writes the current time to last_seen_at', async () => {
    const tracker = await loadTracker()
    at(BASE + 42_000)
    await tracker.recordHeartbeat()
    expect(chromeStub.store['last_seen_at']).toBe(BASE + 42_000)
  })
})

describe('the master tracking switch', () => {
  it('toggleTracking flips settings.trackingEnabled and banks the live session', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    awake(BASE + 120_000)
    const nowEnabled = await tracker.toggleTracking()

    expect(nowEnabled).toBe(false)
    expect((chromeStub.store['settings'] as { trackingEnabled: boolean }).trackingEnabled).toBe(false)
    expect(allEntries()).toHaveLength(1)
    expect(allEntries()[0].duration).toBe(120)
  })

  it('starts no session while tracking is disabled', async () => {
    chromeStub.store['settings'] = { ...DEFAULT_SETTINGS, trackingEnabled: false }
    const tracker = await loadTracker()

    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 600_000)
    await tracker.handleWindowFocusChanged(-1)

    expect(allEntries()).toEqual([])
  })

  it('toggling back on resumes the active tab', async () => {
    chromeStub.store['settings'] = { ...DEFAULT_SETTINGS, trackingEnabled: false }
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')

    const nowEnabled = await tracker.toggleTracking()

    expect(nowEnabled).toBe(true)
    expect(tracker.getCurrentSessionInfo().domain).toBe('github.com')
  })

  it('re-enabling with a session already live does not reset its start time', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 120_000)
    await tracker.applyTrackingEnabled(true)

    expect(tracker.getInMemoryState().sessionStartTime).toBe(BASE)
    expect(tracker.getCurrentSessionInfo().elapsedSeconds).toBe(120)
  })

  it('re-enabling while Chrome is unfocused waits for the focus event', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleWindowFocusChanged(-1)

    await tracker.applyTrackingEnabled(true)

    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
  })
})

describe('discardCurrentSession', () => {
  it('throws the in-flight session away without saving an entry', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    at(BASE + 600_000)
    await tracker.discardCurrentSession()

    expect(allEntries()).toEqual([])
    expect(tracker.getCurrentSessionInfo().domain).toBeNull()
    expect(storedState().sessionStartTime).toBeNull()
  })
})

describe('session info for the popup', () => {
  it('reports zeroes when nothing is being tracked', async () => {
    const tracker = await loadTracker()
    expect(tracker.getCurrentSessionInfo()).toEqual({
      domain: null,
      category: null,
      elapsedSeconds: 0,
    })
  })

  it('reports the live elapsed seconds', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })
    at(BASE + 95_500)
    expect(tracker.getCurrentSessionInfo()).toEqual({
      domain: 'github.com',
      category: 'productive',
      elapsedSeconds: 95,
    })
  })

  it('getInMemoryState returns a copy the caller cannot mutate', async () => {
    const tracker = await loadTracker()
    setActiveTab('https://github.com/')
    await tracker.handleTabActivated({ tabId: 1, windowId: 1 })

    const snapshot = tracker.getInMemoryState()
    snapshot.activeDomain = 'tampered.example'

    expect(tracker.getInMemoryState().activeDomain).toBe('github.com')
  })
})
