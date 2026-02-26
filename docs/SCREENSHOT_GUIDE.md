# Chrome Web Store Screenshot Guide

All screenshots should be captured at **1280×800px** (Chrome Web Store recommended size).
Use a clean Chrome profile with realistic but non-personal demo data.

---

## Screenshot 1 — Extension Popup: Active Tracking

**File name:** `screenshot-1-popup.png`
**Dimensions:** 1280×800 (capture full browser window; crop popup to center if needed, or use a mock frame)

### Required visible state
- Extension popup is open
- **Focus Score ring** prominently displayed — aim for a score in the 65–80 range (looks realistic and aspirational)
- Active tracking indicator is ON (green dot / "正在追蹤" or equivalent)
- Current session shows a productive domain (e.g., `github.com` with 25+ minutes elapsed)
- Stats bar shows today's breakdown: ~3h productive, ~1h distraction, ~30m neutral
- Domain list shows at least 4 domains with color-coded category badges

### How to set up
1. Install the built extension from `apps/extension/dist/`
2. Browse github.com, stackoverflow.com, and one distraction site (e.g., youtube.com) for a few minutes each to populate real data
3. Open the popup while actively on github.com

---

## Screenshot 2 — Web Dashboard: Today Page

**File name:** `screenshot-2-dashboard-today.png`
**Dimensions:** 1280×800 (full browser window at 1280×800)

### Required visible state
- URL bar shows the dashboard URL (or can be hidden)
- **Left sidebar** visible with navigation links (Today, Trends, AI Insights, Settings)
- **Three-column layout** populated:
  - Column 1: Focus Score ring (60–80), today's date, productive/distraction/neutral time totals
  - Column 2: Domain breakdown list with at least 5 domains and time spent
  - Column 3: AI Insight card showing a short generated analysis paragraph (not a loading/empty state)
- Dark theme throughout

### How to set up
1. Ensure the extension has synced today's data to Supabase (Options → Account → Sync Now)
2. Navigate to `/dashboard/today` on the web app
3. If AI insight is empty, trigger an analysis from the popup first

---

## Screenshot 3 — AI Insights Page: Generated Analysis

**File name:** `screenshot-3-ai-insights.png`
**Dimensions:** 1280×800 (full browser window)

### Required visible state
- URL shows `/dashboard/ai-insights`
- Page heading "AI Insights" visible
- At least **2 analysis cards** visible in the list, each showing:
  - Date
  - First 2–3 sentences of the AI analysis (full text, not truncated/loading)
  - Focus score for that day
- The most recent analysis should be fully expanded or clearly readable
- "Analyze Today" button visible at top

### How to set up
1. Trigger AI analysis on 2 different days (or use the Analyze button twice on different dates)
2. Navigate to `/dashboard/ai-insights`
3. Ensure no loading spinners are visible — wait for full render

---

## Screenshot 4 — Extension Options: Privacy Tab

**File name:** `screenshot-4-options-privacy.png`
**Dimensions:** 1280×800 (full browser window — options opens in a tab)

### Required visible state
- Options page open in a full browser tab
- **Privacy tab** selected (隱私 / Privacy)
- Visible sections:
  - "Your data stays on your device" or equivalent privacy declaration
  - Storage usage indicator (e.g., "12 KB used of 5 MB")
  - Export Data button
  - Delete All Data button (red/destructive styling)
- Left tab navigation shows all 5 tabs with Privacy highlighted

### How to set up
1. Right-click extension icon → Options (or navigate via popup settings link)
2. Click the Privacy tab
3. Ensure some tracking data exists so storage usage is non-zero

---

## Capture Tips

- Use **Chrome DevTools Device Toolbar** (Ctrl+Shift+M) set to 1280×800 for consistent sizing
- Hide bookmarks bar for a cleaner look
- Use **Full Page Screenshot** in DevTools (Ctrl+Shift+P → "Capture screenshot") for pixel-perfect export
- Ensure the browser is not in a loading state — all spinners should be resolved
- For the popup screenshot, consider using a browser mockup frame in Figma or Canva to give it context
