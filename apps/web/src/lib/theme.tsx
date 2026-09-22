'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ThemePreference = 'light' | 'dark' | 'system'

const COOKIE = 'echofocus-theme'
const STORAGE_KEY = 'echofocus-theme'

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

// 'system' means no data-theme stamp: the CSS media query decides, and keeps
// tracking live OS changes with no JS involved.
function stamp(preference: ThemePreference): void {
  const el = document.documentElement
  if (preference === 'system') delete el.dataset.theme
  else el.dataset.theme = preference
}

function persistLocally(preference: ThemePreference): void {
  document.cookie = `${COOKIE}=${preference};path=/;max-age=31536000;SameSite=Lax`
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Storage can be unavailable (private mode); the cookie already has it.
  }
}

// Best-effort: signed out, or a cloud row without the 008 columns yet, must
// never break the local switch.
async function pushToCloud(preference: ThemePreference): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_preferences').update({ theme: preference }).eq('user_id', user.id)
  } catch {
    // Ignored — the next successful sync carries it.
  }
}

const ThemeContext = createContext<{
  theme: ThemePreference
  setTheme: (preference: ThemePreference) => void
}>({ theme: 'system', setTheme: () => undefined })

export function ThemeProvider({ initialTheme, children }: { initialTheme: ThemePreference; children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme)

  const setTheme = (preference: ThemePreference) => {
    setThemeState(preference)
    stamp(preference)
    persistLocally(preference)
    void pushToCloud(preference)
  }

  // The cloud copy wins over a stale local one: a choice made on another
  // device (or in the extension's synced storage) lands here on next load.
  useEffect(() => {
    let cancelled = false
    const adopt = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', user.id)
          .maybeSingle()
        const cloud = (data as { theme?: unknown } | null)?.theme
        if (!cancelled && isPreference(cloud) && cloud !== theme) {
          setThemeState(cloud)
          stamp(cloud)
          persistLocally(cloud)
        }
      } catch {
        // Signed out or pre-008 cloud — local preference stands.
      }
    }
    void adopt()
    return () => {
      cancelled = true
    }
    // Runs once per page load on purpose; `theme` in deps would re-fire on
    // every local switch and race the user's click with the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
