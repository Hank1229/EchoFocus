import { themePreferenceSchema, type ThemePreference } from './schemas'

// The stored preference drives all three extension pages. 'system' means no
// data-theme stamp at all — the CSS media query alone decides, and keeps
// tracking live OS changes. The key is written by the settings sync (cloud)
// and read here, so offline pages keep the last known choice.

export const THEME_KEY = 'theme'

export async function getStoredTheme(): Promise<ThemePreference> {
  const stored = await chrome.storage.local.get(THEME_KEY)
  const parsed = themePreferenceSchema.safeParse(stored[THEME_KEY])
  return parsed.success ? parsed.data : 'system'
}

const MIRROR_KEY = 'echofocus-theme'

function stamp(preference: ThemePreference): void {
  const el = document.documentElement
  if (preference === 'system') delete el.dataset.theme
  else el.dataset.theme = preference
  // Synchronous mirror for the pre-JS boot script (theme-boot.js): the next
  // page open paints its first frame from this, then confirms against
  // chrome.storage before React mounts.
  try {
    if (preference === 'system') localStorage.removeItem(MIRROR_KEY)
    else localStorage.setItem(MIRROR_KEY, preference)
  } catch {
    // Storage full/unavailable — the boot script just falls back to the OS.
  }
}

// Call once at page entry, and await it before mounting React: the returned
// promise resolves after the stored preference is stamped, so the first
// rendered frame is already themed. Later changes (a sync pulling a new
// choice) restyle already-open pages live.
export async function applyStoredTheme(): Promise<void> {
  stamp(await getStoredTheme())
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(THEME_KEY in changes)) return
    const parsed = themePreferenceSchema.safeParse(changes[THEME_KEY].newValue)
    stamp(parsed.success ? parsed.data : 'system')
  })
}
