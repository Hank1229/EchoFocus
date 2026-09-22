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

function stamp(preference: ThemePreference): void {
  const el = document.documentElement
  if (preference === 'system') delete el.dataset.theme
  else el.dataset.theme = preference
}

// Call once at page entry. Stamps the stored preference and follows any later
// change (a sync pulling a new choice restyles already-open pages live).
export function applyStoredTheme(): void {
  void getStoredTheme().then(stamp)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(THEME_KEY in changes)) return
    const parsed = themePreferenceSchema.safeParse(changes[THEME_KEY].newValue)
    stamp(parsed.success ? parsed.data : 'system')
  })
}
