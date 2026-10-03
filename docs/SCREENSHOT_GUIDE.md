# Chrome Web Store Screenshot Guide

Capture every screenshot at **1280×800px**, the size the Chrome Web Store recommends.
Use a clean Chrome profile with realistic demo data that contains nothing personal.

---

## Screenshot 1: Extension Popup, Active Tracking

**File name:** `screenshot-1-popup.png`
**Dimensions:** 1280×800 (capture the full browser window, then crop so the popup sits in the center if needed, or use a mock frame)

### Required visible state
- The extension popup is open
- The **Focus Score ring** is easy to see. Aim for a score in the 65 to 80 range, which looks realistic and still gives the viewer something to aim for
- The active tracking indicator is ON (green dot / "正在追蹤" or equivalent)
- The current session shows a productive domain (for example `github.com` with 25+ minutes elapsed)
- The stats bar shows today's breakdown: ~3h productive, ~1h distraction, ~30m neutral
- The domain list shows at least 4 domains with color-coded category badges

### How to set up
1. Install the built extension from `apps/extension/dist/`
2. Spend a few minutes each on github.com, stackoverflow.com, and one distraction site (such as youtube.com) so the extension records real data
3. Open the popup while github.com is the active tab

---

## Screenshot 2: Web Dashboard, Today Page

**File name:** `screenshot-2-dashboard-today.png`
**Dimensions:** 1280×800 (full browser window at 1280×800)

### Required visible state
- The URL bar shows the dashboard URL (or you can hide it)
- The **left sidebar** is visible with its navigation links (Today, Trends, AI Insights, Settings)
- The **three-column layout** has content in every column:
  - Column 1: Focus Score ring (60 to 80), today's date, and productive/distraction/neutral time totals
  - Column 2: domain breakdown list with at least 5 domains and the time spent on each
  - Column 3: AI Insight card with a short generated analysis paragraph, past any loading or empty state
- Dark theme throughout

### How to set up
1. Make sure the extension has synced today's data to Supabase (Options → Account → Sync Now)
2. Open `/dashboard/today` in the web app
3. If the AI insight is empty, run an analysis from the popup first

---

## Screenshot 3: AI Insights Page, Generated Analysis

**File name:** `screenshot-3-ai-insights.png`
**Dimensions:** 1280×800 (full browser window)

### Required visible state
- The URL shows `/dashboard/ai-insights`
- The page heading "AI Insights" is visible
- At least **2 analysis cards** appear in the list, each showing:
  - Date
  - The first 2 or 3 sentences of the AI analysis (complete text, with no truncation or loading state)
  - Focus score for that day
- The most recent analysis is expanded in full or easy to read
- The "Analyze Today" button is visible at the top

### How to set up
1. Run an AI analysis on 2 different days (or press the Analyze button twice, on different dates)
2. Open `/dashboard/ai-insights`
3. Wait for the page to finish rendering so no loading spinners show

---

## Screenshot 4: Extension Options, Privacy Tab

**File name:** `screenshot-4-options-privacy.png`
**Dimensions:** 1280×800 (full browser window, because Options opens in a tab)

### Required visible state
- The Options page is open in a full browser tab
- The **Privacy tab** is selected (隱私 / Privacy)
- Visible sections:
  - "Your data stays on your device" or a matching privacy statement
  - Storage usage indicator (for example "12 KB used of 5 MB")
  - Export Data button
  - Delete All Data button (red, destructive styling)
- The left tab navigation shows all 5 tabs with Privacy highlighted

### How to set up
1. Right-click the extension icon → Options (or follow the settings link in the popup)
2. Click the Privacy tab
3. Make sure some tracking data exists so storage usage reads above zero

---

## Capture Tips

- Set the **Chrome DevTools Device Toolbar** (Ctrl+Shift+M) to 1280×800 so every capture has the same size
- Hide the bookmarks bar to cut clutter
- Use **Full Page Screenshot** in DevTools (Ctrl+Shift+P → "Capture screenshot") for a pixel-perfect export
- Wait until the browser has finished loading and every spinner is gone
- For the popup screenshot, you can place it in a browser mockup frame in Figma or Canva to give it context
