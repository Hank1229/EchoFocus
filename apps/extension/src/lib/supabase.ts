import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Session storage key in chrome.storage.local
const SESSION_KEY = 'supabase_session'

// Custom storage adapter that persists the Supabase session in
// chrome.storage.local instead of localStorage (which isn't available
// in the extension's background service worker context).
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key)
    return (result[key] as string | undefined) ?? null
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value })
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key)
  },
}

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeStorageAdapter,
        storageKey: SESSION_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Must be 'implicit' for Chrome Extensions — PKCE requires storing a
        // code verifier across the redirect, which is unreliable in a service
        // worker. Implicit flow puts tokens directly in the hash fragment.
        flowType: 'implicit',
      },
    })
  }
  return _client
}
