// Minimal in-memory stand-in for the slice of the `chrome.*` MV3 API the
// background scripts use: storage.local, alarms, idle, tabs, windows, runtime.
// Values are structured-cloned on the way in and out, matching the real API's
// serialization so a test can never observe a shared object reference.

export interface StubTab {
  id: number
  windowId: number
  active: boolean
  url?: string
  title?: string
  audible?: boolean
}

export interface StubAlarm {
  name: string
  scheduledTime: number
  periodInMinutes?: number
}

export interface StubNotification {
  id: string
  options: chrome.notifications.NotificationOptions<true>
}

export interface ChromeStub {
  /** Raw chrome.storage.local contents — assert on real key names. */
  store: Record<string, unknown>
  /** Alarms by name, with the exact create() options they were given. */
  alarms: Map<string, chrome.alarms.AlarmCreateInfo>
  /** How many times create() was called per alarm name. */
  alarmCreateCounts: Map<string, number>
  tabs: StubTab[]
  /** Backs chrome.windows.getLastFocused(). */
  lastFocusedWindow: { id: number; focused: boolean }
  /** windowId that `query({ lastFocusedWindow: true })` resolves against. */
  lastFocusedWindowId: number
  idleDetectionIntervalSeconds: number | null
  createdTabUrls: string[]
  removedKeys: string[][]
  quotaBytes: number
  /** Notifications currently on screen, in creation order. */
  notifications: StubNotification[]
  clearedNotificationIds: string[]
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function installChromeStub(): ChromeStub {
  const stub: ChromeStub = {
    store: {},
    alarms: new Map(),
    alarmCreateCounts: new Map(),
    tabs: [],
    lastFocusedWindow: { id: 1, focused: true },
    lastFocusedWindowId: 1,
    idleDetectionIntervalSeconds: null,
    createdTabUrls: [],
    removedKeys: [],
    quotaBytes: 10485760,
    notifications: [],
    clearedNotificationIds: [],
  }

  function keyList(keys: string | string[] | Record<string, unknown> | null | undefined): string[] {
    if (keys === null || keys === undefined) return Object.keys(stub.store)
    if (typeof keys === 'string') return [keys]
    if (Array.isArray(keys)) return keys
    return Object.keys(keys)
  }

  const local = {
    QUOTA_BYTES: stub.quotaBytes,
    async get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
      const out: Record<string, unknown> = {}
      for (const key of keyList(keys)) {
        if (key in stub.store) out[key] = clone(stub.store[key])
      }
      return out
    },
    async set(items: Record<string, unknown>): Promise<void> {
      for (const [key, value] of Object.entries(items)) {
        stub.store[key] = clone(value)
      }
    },
    async remove(keys: string | string[]): Promise<void> {
      const list = typeof keys === 'string' ? [keys] : keys
      stub.removedKeys.push([...list])
      for (const key of list) delete stub.store[key]
    },
    async clear(): Promise<void> {
      stub.store = {}
    },
    getBytesInUse(
      keys: string | string[] | null,
      callback?: (bytesInUse: number) => void,
    ): Promise<number> | void {
      let bytes = 0
      for (const key of keyList(keys)) {
        bytes += key.length + JSON.stringify(stub.store[key] ?? null).length
      }
      if (callback) {
        callback(bytes)
        return
      }
      return Promise.resolve(bytes)
    },
  }

  const alarms = {
    async create(name: string, info: chrome.alarms.AlarmCreateInfo): Promise<void> {
      stub.alarms.set(name, { ...info })
      stub.alarmCreateCounts.set(name, (stub.alarmCreateCounts.get(name) ?? 0) + 1)
    },
    async get(name: string): Promise<StubAlarm | undefined> {
      const info = stub.alarms.get(name)
      if (!info) return undefined
      return {
        name,
        scheduledTime: info.when ?? Date.now() + (info.delayInMinutes ?? 0) * 60_000,
        periodInMinutes: info.periodInMinutes,
      }
    },
    async getAll(): Promise<StubAlarm[]> {
      const all: StubAlarm[] = []
      for (const name of stub.alarms.keys()) {
        const alarm = await alarms.get(name)
        if (alarm) all.push(alarm)
      }
      return all
    },
    async clear(name: string): Promise<boolean> {
      return stub.alarms.delete(name)
    },
    onAlarm: { addListener: () => undefined },
  }

  const tabs = {
    async get(tabId: number): Promise<StubTab> {
      const tab = stub.tabs.find((t) => t.id === tabId)
      if (!tab) throw new Error(`No tab with id: ${tabId}`)
      return clone(tab)
    },
    async query(info: {
      active?: boolean
      windowId?: number
      lastFocusedWindow?: boolean
    }): Promise<StubTab[]> {
      return stub.tabs
        .filter((t) => (info.active === undefined ? true : t.active === info.active))
        .filter((t) => (info.windowId === undefined ? true : t.windowId === info.windowId))
        .filter((t) => (info.lastFocusedWindow ? t.windowId === stub.lastFocusedWindowId : true))
        .map(clone)
    },
    async create(info: { url: string }): Promise<StubTab> {
      stub.createdTabUrls.push(info.url)
      const tab: StubTab = { id: 9999, windowId: stub.lastFocusedWindowId, active: true, url: info.url }
      return tab
    },
    onActivated: { addListener: () => undefined },
    onUpdated: { addListener: () => undefined },
  }

  // Callback-shaped like the real API, which @types/chrome still types as
  // callback-only for this namespace.
  const notifications = {
    create(
      id: string,
      options: chrome.notifications.NotificationOptions<true>,
      callback?: (notificationId: string) => void,
    ): void {
      stub.notifications.push({ id, options: clone(options) })
      callback?.(id)
    },
    clear(id: string, callback?: (wasCleared: boolean) => void): void {
      stub.clearedNotificationIds.push(id)
      const index = stub.notifications.findIndex((n) => n.id === id)
      if (index !== -1) stub.notifications.splice(index, 1)
      callback?.(index !== -1)
    },
    onClicked: { addListener: () => undefined },
  }

  const chromeStub = {
    storage: { local },
    alarms,
    tabs,
    notifications,
    idle: {
      setDetectionInterval(seconds: number): void {
        stub.idleDetectionIntervalSeconds = seconds
      },
      onStateChanged: { addListener: () => undefined },
    },
    windows: {
      WINDOW_ID_NONE: -1,
      WINDOW_ID_CURRENT: -2,
      async getLastFocused(): Promise<{ id: number; focused: boolean }> {
        return { ...stub.lastFocusedWindow }
      },
      onFocusChanged: { addListener: () => undefined },
    },
    runtime: {
      id: 'echofocus-test',
      lastError: undefined,
      getURL: (path: string) => `chrome-extension://echofocus-test/${path}`,
      onInstalled: { addListener: () => undefined },
      onStartup: { addListener: () => undefined },
      onMessage: { addListener: () => undefined },
      onConnect: { addListener: () => undefined },
    },
  }

  ;(globalThis as { chrome?: unknown }).chrome = chromeStub as unknown as typeof chrome
  return stub
}
