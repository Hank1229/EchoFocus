import type { Settings } from '@echofocus/shared'
import { getSettings, saveSettings } from './storage'
import { applyTrackingEnabled } from './tracker'

// The single write path for settings: store the patch, then re-apply the side
// effects the new values imply. The SAVE_SETTINGS message and the cloud pull
// both go through here, so neither can quietly skip one of them.
export async function applySettings(patch: Partial<Settings>): Promise<void> {
  await saveSettings(patch)

  if (patch.trackingEnabled !== undefined) {
    await applyTrackingEnabled(patch.trackingEnabled)
  }

  const { idleTimeoutMinutes } = await getSettings()
  chrome.idle.setDetectionInterval(idleTimeoutMinutes * 60)
}
