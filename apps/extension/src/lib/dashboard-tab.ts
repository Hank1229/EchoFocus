import { DASHBOARD_URL } from './config'

export const DASHBOARD_ORIGIN = new URL(DASHBOARD_URL).origin

// After a sign-in the user asked for on this side, land them on a signed-in
// dashboard. An existing dashboard tab is reused rather than stacked;
// /login?auto=1 completes the web sign-in on the Google session just created,
// and the middleware bounces it straight to the dashboard if that tab was
// already signed in.
export async function openSignedInDashboard(): Promise<void> {
  const url = `${DASHBOARD_URL}/login?auto=1`
  const [existing] = await chrome.tabs.query({ url: `${DASHBOARD_ORIGIN}/*` })
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { url, active: true })
    await chrome.windows.update(existing.windowId, { focused: true })
    return
  }
  await chrome.tabs.create({ url })
}
