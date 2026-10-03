# Chrome Web Store Screenshot Guide

Capture every screenshot at **1280×800px**, the size the Chrome Web Store recommends.
Use a clean Chrome profile with realistic demo data that contains nothing personal.

---

## Screenshot 1: Extension Popup, Active Tracking

**File name:** `screenshot-1-popup.png`
**Dimensions:** 1280×800 (capture the full browser window, then crop so the popup sits in the center if needed, or use a mock frame)

### Required visible state
- The extension popup is open
- The **Focus Score ring** is easy to see. Aim for a score in the 65 to 80 range, which looks realistic and still gives the viewer something to aim for. Leave the focus timer idle: a running round replaces the ring with its countdown
- The tracking toggle in the header is ON (the teal pill with an eye icon reading "Tracking" / "追蹤中")
- The current session shows a productive domain (for example `github.com` with 25+ minutes elapsed)
- The three category columns show today's breakdown: ~3h Productive, ~1h Breaks & Browsing, ~30m Neutral
- The "Today's sites" list shows at least 4 domains, each with its site icon and a color-coded category dot

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
- The **left sidebar** is visible with its navigation links (Today's Overview, Trends, Guide, Settings)
- The header shows today's date
- The **review card** has content in every part:
  - Focus score dial (60 to 80) on the left; Total tracked and the Productive / Breaks & Browsing / Neutral time totals on the right
  - The time breakdown bar across the card
  - The **Daily insight** at the foot of the card, with a short generated analysis paragraph, past any loading or empty state
- The "Focus by hour" chart and the "Where the time went" site list sit below the card; at 1280×800 the site list falls below the fold
- Dark theme throughout (Settings → General → Theme → Dark)

### How to set up
1. Make sure the extension has synced today's data to Supabase (Options → Account → Sync today's data)
2. Open `/dashboard/today` in the web app
3. If the Daily insight is empty, click **Generate Insight** in the card. With under 30 minutes tracked, the insight only says there is not enough data

---

## Screenshot 3: Trends Page, Weekly Review

**File name:** `screenshot-3-trends-weekly-review.png`
**Dimensions:** 1280×800 (full browser window)

### Required visible state
- The URL shows `/dashboard/trends`
- The page is scrolled to its foot, so the **Weekly review** card is in full view
- The card shows a generated retrospective (complete text, with no truncation or loading state) and its Regenerate button

### How to set up
1. Sync several days of data: the review covers the 7 most recently synced days
2. Open `/dashboard/trends` and click **Weekly review** in the card at the foot of the page. The server allows one weekly review per week, so generate it once
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
  - Storage usage indicator (for example "Used 0.01 MB / 10 MB" above a bar)
  - Export JSON and Export CSV buttons
  - Delete all tracking data button (red text inside the red-outlined Reset section)
- The tab bar across the top shows all 5 tabs with Privacy highlighted

### How to set up
1. Right-click the extension icon → Options (or click a site in the popup, which opens Options on the Categories tab)
2. Click the Privacy tab
3. Make sure some tracking data exists so storage usage reads above zero

---

## Capture Tips

- Set the **Chrome DevTools Device Toolbar** (Ctrl+Shift+M) to 1280×800 so every capture has the same size
- Hide the bookmarks bar to cut clutter
- Use **Full Page Screenshot** in DevTools (Ctrl+Shift+P → "Capture screenshot") for a pixel-perfect export
- Wait until the browser has finished loading and every spinner is gone
- For the popup screenshot, you can place it in a browser mockup frame in Figma or Canva to give it context
