# EchoFocus: User Workflow & UI Structure

> A reference for every user-facing workflow, screen, component, and data flow in the EchoFocus Chrome Extension and Web Dashboard.
> Generated from the source code and kept in sync with it.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Workflows](#2-user-workflows)
   - [WF-01 First Install & Onboarding](#wf-01-first-install--onboarding)
   - [WF-02 Sign In (Extension)](#wf-02-sign-in-extension)
   - [WF-03 Daily Browsing Tracking](#wf-03-daily-browsing-tracking)
   - [WF-04 View Today's Stats (Popup)](#wf-04-view-todays-stats-popup)
   - [WF-05 Sync to Cloud](#wf-05-sync-to-cloud)
   - [WF-06 AI Analysis (Manual)](#wf-06-ai-analysis-manual)
   - [WF-07 View AI Insights (Web)](#wf-07-view-ai-insights-web)
   - [WF-08 View Trends (Web)](#wf-08-view-trends-web)
   - [WF-09 Manage Custom Rules (Extension Options)](#wf-09-manage-custom-rules-extension-options)
   - [WF-10 Configure Preferences (Web Settings)](#wf-10-configure-preferences-web-settings)
   - [WF-11 Email Report](#wf-11-email-report)
   - [WF-12 Data Export & Deletion](#wf-12-data-export--deletion)
3. [UI Structure: Extension](#3-ui-structure-extension)
4. [UI Structure: Web Dashboard](#4-ui-structure-web-dashboard)
5. [Navigation Map](#5-navigation-map)
6. [Data Architecture](#6-data-architecture)
7. [Scheduled Events](#7-scheduled-events)

---

## 1. Product Overview

EchoFocus is a productivity tracker that ships as a **Chrome Extension** (Manifest V3) with a companion **Web Dashboard** (Next.js 14). Google Gemini writes the AI analysis of each day's numbers.

| Concern | Where it lives |
|---|---|
| Raw browsing data (URLs, durations, per-site entries) | `chrome.storage.local` (**never leaves the device**) |
| Aggregated daily stats (domain names + seconds, no URLs) | Supabase `synced_aggregates` table |
| AI analysis results | Supabase `ai_analyses` table |
| User preferences | Supabase `user_preferences` table |
| Authentication | Supabase Auth (Google OAuth) |
| AI inference | Google Gemini API via Supabase Edge Function (server-side) |
| Email delivery | Resend via Supabase Edge Function |

**Core privacy guarantee:** Supabase receives only aggregated domain-level statistics and AI-generated text. Raw URLs, page titles, and the full browsing history stay on the user's device.

---

## 2. User Workflows

### WF-01 First Install & Onboarding

**Trigger:** The user installs the extension from the Chrome Web Store or loads it unpacked.

**Steps:**

1. `chrome.runtime.onInstalled` fires with `reason === 'install'`.
2. The background service worker calls `chrome.tabs.create({ url: onboarding.html })`.
3. The onboarding page opens in a full tab (`apps/extension/src/onboarding/App.tsx`).
4. The user goes through 4 steps:
   - **Step 1 (Welcome):** the product name, the tagline, and a "Get Started" button.
   - **Step 2 (Privacy):** explains local-only storage, what goes to the cloud, and the privacy-first design.
   - **Step 3 (Sign In):** a Google OAuth button that signs the user in through `chrome.identity.launchWebAuthFlow`. On success, the extension stores the session in `chrome.storage.local['supabase_session']`.
   - **Step 4 (Done):** a confirmation screen with one link that opens the popup and another to the web dashboard.
5. The user can click the extension icon at any time to open the popup.

**Data flow:**
- Sign-in writes `supabase_session` to `chrome.storage.local`.
- `background/storage.ts` loads this session for every later Supabase call the extension makes.

**End state:** The extension is authenticated, and tracking starts on its own once the user browses.

---

### WF-02 Sign In (Extension)

**Trigger:** The user clicks "Sign in with Google" in the popup (when signed out) or in the Options → Account tab.

**Steps:**

1. The UI calls `signInWithGoogle()` from `apps/extension/src/lib/auth.ts`.
2. `chrome.identity.launchWebAuthFlow` opens a Google consent popup.
3. On success, the extension exchanges the OAuth code for a Supabase session.
4. The extension writes the session JSON to `chrome.storage.local['supabase_session']`.
5. The UI switches to the signed-in state (email, avatar).

**End state:** The user is authenticated, and the sync and AI features become available.

---

### WF-03 Daily Browsing Tracking

**Trigger:** Automatic. Tracking runs while the browser is open and the user is active.

**Steps:**

1. **Tab activated or URL changed:** `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` fire in `background/tracker.ts`.
2. The tracker extracts the domain from the current URL.
3. If the **previous** tab ran for ≥ 5 seconds, the tracker saves its duration as a `TrackingEntry` to `chrome.storage.local['entries:YYYY-MM-DD']`.
4. A new tracking session begins, and the tracker stores the domain and `startTime` in `chrome.storage.local['tracking_state']`.
5. **Idle detection:** `chrome.idle.onStateChanged` fires when the user goes idle or locks the screen. The tracker pauses and saves the open session.
6. When the user comes back from idle, tracking restarts with a fresh `startTime`.
7. **Service worker restart:** when the worker wakes up, the tracker reads `tracking_state` from storage to rebuild the last known state.

**Categorization:** The tracker assigns each domain `productive` / `distraction` / `neutral` / `uncategorized`, based on two sources:
- Default rules in `packages/shared/src/constants/categories.ts` (100+ domains).
- The user's custom rules from `chrome.storage.local['custom_rules']`, which take the highest priority.

**Data flow:**
```
Tab event → tracker.ts → TrackingEntry → chrome.storage.local['entries:YYYY-MM-DD']
                       → DailyAggregate (hourly alarm) → chrome.storage.local['aggregates:YYYY-MM-DD']
```

**End state:** `entries:YYYY-MM-DD` grows through the day, and the hourly alarm recomputes `aggregates:YYYY-MM-DD`.

---

### WF-04 View Today's Stats (Popup)

**Trigger:** The user clicks the EchoFocus extension icon.

**Steps:**

1. The popup mounts (`apps/extension/src/popup/App.tsx`).
2. It sends a `GET_TRACKING_STATE` message to the background and gets back `{ isTracking, domain, category, elapsedSeconds }`.
3. It reads today's `DailyAggregate` from storage with a `GET_AGGREGATE` message.
4. It displays:
   - **TrackingToggle:** a green pill that reads "Tracking" or "Paused". Clicking it toggles tracking.
   - **FocusScoreRing:** an SVG ring with the score (0 to 100), a label (Excellent/Average/Room to grow), and "pts".
   - **StatsBar:** a horizontal stacked bar with the productive/distraction/neutral split and each duration.
   - **DomainList:** the top domains ranked by time, each with a category icon, name, category label, and duration.
   - **AiInsightCard:** the last AI analysis summary (collapsible). If there is none, the card shows an "Analyze" prompt.
5. The footer holds a **Lightbulb** icon (opens options), a **Settings** icon (opens options), and a **User** icon (opens `/dashboard/settings` in a new tab).

**Data flow:** The popup reads all of its data from `chrome.storage.local` and makes no network calls when it opens.

**End state:** The user sees today's browsing stats and can toggle tracking or start an AI analysis.

---

### WF-05 Sync to Cloud

**Trigger:** Automatic (daily alarm at 00:05) **or** manual (Options → Account → "Sync Now" button).

**Steps:**

1. `runMidnightSync()` in `background/alarms.ts` runs.
2. It reads yesterday's `DailyAggregate` from `chrome.storage.local['aggregates:YYYY-MM-DD']`.
3. If the aggregate exists and the user is signed in, it calls `syncToSupabase(aggregate)` from `apps/extension/src/lib/sync.ts`.
4. `sync.ts` upserts a row into the Supabase `synced_aggregates` table with these fields:
   - `user_id`, `date`, `total_seconds`, `productive_seconds`, `distraction_seconds`, `neutral_seconds`, `uncategorized_seconds`, `focus_score`, `top_domains` (JSONB array of `{ domain, seconds, category }`)
5. It writes the current ISO timestamp to `chrome.storage.local['last_sync_at']`.

**Privacy check:** The extension sends only aggregated domain-level data, with no raw URLs or page titles.

**Data flow:**
```
chrome.storage.local['aggregates:YYYY-MM-DD']
  → sync.ts
  → Supabase synced_aggregates (upsert)
  → chrome.storage.local['last_sync_at']
```

**End state:** The web dashboard can now show the day's data.

---

### WF-06 AI Analysis (Manual)

**Trigger:** The user clicks "Analyze" in one of two places:
- The popup (`App.tsx` → AiInsightCard)
- The web dashboard AI Insights page (`AnalyzeButton.tsx`)

**Steps (Extension popup path):**

1. `handleAnalyze()` in the popup sends a `REQUEST_AI_ANALYSIS` message with `{ date, language }` to the background.
2. `background/index.ts` receives the message and calls `requestAiAnalysis(date, language)` from `lib/ai.ts`.
3. `ai.ts` reads today's `DailyAggregate` from storage.
4. It builds an anonymized payload: `{ date, language, aggregate: { totalMinutes, productiveMinutes, distractionMinutes, neutralMinutes, topDomains: [{ domain, minutes, category }], focusScore } }`.
5. It POSTs the payload to the Supabase Edge Function `ai-analyze` with the user's auth token.
6. The Edge Function calls the Gemini API (`gemini-3.5-flash-lite`) with a structured prompt in the requested language (EN or zh-TW).
7. The Edge Function saves the result to the Supabase `ai_analyses` table.
8. It returns the analysis text and focus_score to the extension.
9. The extension saves the result to `chrome.storage.local['ai_analysis:YYYY-MM-DD']`.
10. The popup's `AiInsightCard` shows the new analysis.

**Steps (Web dashboard path):**

1. The user clicks "Analyze" on the AI Insights page.
2. `AnalyzeButton.tsx` (a client component) reads the Supabase session.
3. It POSTs straight to the Edge Function `ai-analyze`.
4. On success, the router refreshes and the new analysis appears in the history list.

**Data flow:**
```
DailyAggregate (local) → ai.ts → Edge Function ai-analyze
  → Gemini API → analysis text
  → Supabase ai_analyses (saved server-side)
  → chrome.storage.local['ai_analysis:YYYY-MM-DD'] (saved client-side)
```

**End state:** The AI analysis appears in the popup's AiInsightCard and in the web AI Insights history.

---

### WF-07 View AI Insights (Web)

**Trigger:** The user opens `/dashboard/ai-insights` in the web dashboard.

**Steps:**

1. A server component fetches the authenticated user's last 30 AI analyses from the `ai_analyses` table.
2. The left panel, "Generate Now", holds the `AnalyzeButton` client component.
3. The right panel, "Snapshot History", lists each analysis with its date, a focus score badge, and the analysis text.
4. The score badges use three colors: green (≥70), yellow (≥40), red (<40).
5. Dates appear in the user's locale (EN or zh-TW).

**End state:** The user sees their full AI analysis history and can generate a new snapshot.

---

### WF-08 View Trends (Web)

**Trigger:** The user opens `/dashboard/trends`.

**Steps:**

1. A server component reads the `period` query param (`?period=7` or `?period=30`, default 7).
2. It fetches the matching rows from `synced_aggregates`, ordered by date ascending.
3. It renders:
   - **Period selector:** "Last 7 days" and "Last 30 days" link buttons (client-side navigation via `<a>` tags).
   - **Summary stats row:** Avg Focus Score, Total Productive Time, Total Breaks & Browsing.
   - **Activity Bar Chart** (`ActivityBarChart.tsx`): one stacked bar per day, with productive (green), distraction (orange), and neutral (slate).
   - **Focus Score Line Chart** (`FocusScoreChart.tsx`): a line of the daily focus score against a dashed reference line.
4. With no data, the page shows an empty state with a 📉 icon.

**End state:** The user sees trends over the selected period.

---

### WF-09 Manage Custom Rules (Extension Options)

**Trigger:** The user opens Options (right-click the extension → Options). The popup's gear opens Dashboard Settings instead, and that page's footer points the user here for the extension-only settings.

**Steps:**

1. The Options page mounts (`apps/extension/src/options/App.tsx`) with a 5-tab layout.
2. The user opens the **類別** (Categories) tab.
3. The page loads the existing custom rules from `chrome.storage.local['custom_rules']`.
4. The user can:
   - **Add a rule:** enter a domain pattern, pick a category, and click "Add".
   - **Edit a rule:** click edit on a rule row, change it, and save.
   - **Delete a rule:** click the delete icon on a rule row.
5. On save, the page sends a `SAVE_CUSTOM_RULES` message to the background.
6. The background writes the new rules to `chrome.storage.local['custom_rules']`.
7. The background calls `loadCustomRules()` so the tracker uses the new rules right away.

**End state:** The new rules apply from the next tab change.

---

### WF-10 Configure Preferences (Web Settings)

**Trigger:** The user opens `/dashboard/settings`.

**Steps:**

1. A server component fetches the authenticated user's `user_preferences` row.
2. The page renders 4 sections:
   - **Account:** avatar, name, email, a "Connected via Google" badge, and a Sign Out button.
   - **Preferences** (`SettingsForm.tsx`): the language toggle, the Daily Email Report toggle, a Send Test Email button, and the Daily Focus Goal slider.
   - **Data Management:** an Export Cloud Data button and a Delete All Cloud Data button.
   - **About:** the app version and links to the Privacy Policy, Terms, GitHub, and Report Issue.
3. The user changes preferences and clicks "Save Settings".
4. `SettingsForm.handleSave()` upserts the changes into the Supabase `user_preferences` table.
5. The language toggle calls `setLanguage()` from `useLocale()`, which writes the `echofocus-lang` cookie, and the page re-renders in the new language.

**End state:** Supabase holds the saved preferences, and a language change shows up right away.

---

### WF-11 Email Report

**Trigger:** An automatic daily cron (a Supabase Edge Function scheduled at 07:00 user-local time) **or** a manual test email from Settings.

**Steps:**

1. The `send-email-report` Edge Function runs.
2. It reads the user's `user_preferences` and stops there if `email_report_enabled` is false.
3. It fetches the last 1 day's `synced_aggregates` row, plus the last 7 days for the average.
4. It fetches the latest `ai_analyses` row.
5. It builds an HTML email with:
   - EchoFocus branding.
   - Today's focus score (large, color-coded).
   - A comparison with the 7-day average.
   - A time breakdown (productive / distraction / neutral).
   - The top 5 domains.
   - The AI insight summary.
   - An "Open Dashboard" call-to-action button.
6. It sends the email to the user's address through the Resend API.

**Manual test path:**
- The user clicks "Send Test Report" in Settings.
- `SettingsForm.handleSendTestEmail()` POSTs to the `send-email-report` Edge Function with the user's auth token.
- The button shows Sending → Sent ✓ / Failed, and the result stays up for 3 seconds.

**End state:** The email lands in the user's inbox.

---

### WF-12 Data Export & Deletion

#### Export

**Trigger:** The user clicks "Export Cloud Data (JSON)" in Settings → Data Management.

**Steps:**

1. `ExportCloudDataButton.tsx` fetches the last 30 days of `synced_aggregates` and `ai_analyses` from Supabase.
2. It merges them into one JSON object: `{ exported_at, synced_aggregates: [...], ai_analyses: [...] }`.
3. It creates a `Blob` and starts a browser file download (`echofocus-export-YYYY-MM-DD.json`).

#### Deletion

**Trigger:** The user clicks "Delete All Cloud Data" in Settings → Data Management.

**Steps:**

1. `DeleteCloudDataButton.tsx` shows a confirmation dialog in which the user types a confirmation.
2. On confirm, it deletes all of the user's rows from `synced_aggregates` and `ai_analyses`.
3. Supabase RLS limits the delete to the authenticated user's rows.
4. The button shows "✓ All cloud data deleted" for 3 seconds.

**Note:** This deletes cloud (Supabase) data only. Local `chrome.storage.local` data on the device has its own controls, in the extension's Options → Privacy tab.

---

## 3. UI Structure: Extension

### Popup (`apps/extension/src/popup/`)

```
App.tsx
├── Header bar
│   ├── EchoFocus logo (text)
│   ├── [Lightbulb icon] → opens options page
│   ├── [Settings icon] → opens options page
│   └── [User icon] → opens /dashboard/settings in new tab
│
├── TrackingToggle.tsx
│   ├── Green pill: "Tracking" or amber "Paused"
│   ├── Click → sends TOGGLE_TRACKING to background
│   └── Tooltip: "Click to pause tracking" / "Click to resume tracking"
│
├── FocusScoreRing.tsx
│   ├── SVG ring (green/yellow/red based on score)
│   ├── Score number (large)
│   ├── "pts" label
│   └── Quality label: "Excellent" / "Average" / "Room to grow"
│
├── StatsBar.tsx
│   ├── "Today's Total" header with total duration
│   ├── Stacked progress bar (green / orange / slate)
│   └── Legend: Productive · Distraction · Neutral (with durations)
│
├── DomainList.tsx
│   ├── List of top domains (up to 10)
│   │   ├── Category icon (Zap/Coffee/Minus)
│   │   ├── Domain name (truncated)
│   │   ├── Category label
│   │   └── Duration
│   └── Empty state: "No browsing activity recorded yet" + "Keep browsing..."
│
└── AiInsightCard.tsx
    ├── Collapsed: "AI Insight" header + "Analyze" button
    ├── If analysis exists: shows analysis text + date
    └── Analyze button → sends REQUEST_AI_ANALYSIS to background
```

**Popup dimensions:** a fixed width (~360px), with scrolling content.

---

### Options Page (`apps/extension/src/options/`)

The page has a 5-tab layout (`App.tsx`):

```
Tab 1: 一般 (General)
├── Idle timeout slider (1–15 min)
├── Daily focus goal slider (1–12 hrs)
└── [Save Settings] button

Tab 2: 類別 (Categories)
├── Custom rules list
│   ├── Domain pattern
│   ├── Category select (productive / distraction / neutral)
│   └── [Edit] [Delete] actions
└── Add rule form: [domain input] + [category select] + [Add] button

Tab 3: 隱私 (Privacy)
├── Privacy statement (local storage explanation)
├── Last sync timestamp
├── [Sync Now] button
└── [Delete Local Data] button (with confirmation)

Tab 4: 帳戶 (Account)
├── If signed in: email, avatar, last sync time, [Sign Out]
├── If not signed in: [Sign in with Google] button
└── [Sync Now] manual trigger

Tab 5: 關於 (About)
├── App version
├── Links: Privacy Policy, Terms of Service, GitHub
└── "Report an Issue" link
```

---

### Onboarding Page (`apps/extension/src/onboarding/`)

A 4-step wizard that fills a browser tab:

```
Step 1: Welcome
├── EchoFocus logo + tagline
└── [Get Started →] button

Step 2: Privacy First
├── Explanation of local vs. cloud data
├── Visual list of what stays local / what goes to cloud
└── [Next →] button

Step 3: Sign In
├── Google OAuth button
├── Progress indicator
└── Error state if auth fails

Step 4: All Set!
├── Success confirmation
├── [Open Extension] link
└── [View Dashboard] link → web dashboard
```

---

## 4. UI Structure: Web Dashboard

### Root Layout (`apps/web/src/app/dashboard/layout.tsx`)

```
<html>
  <body>
    <DashboardSidebar />         ← fixed left sidebar
    <div class="flex-1 flex flex-col">
      [page content renders here]
    </div>
  </body>
</html>
```

---

### DashboardSidebar (`apps/web/src/components/layout/DashboardSidebar.tsx`)

```
Sidebar (fixed, dark bg-slate-950, w-56)
├── Logo: "EchoFocus" → /dashboard/today
├── Nav items (with active state highlight):
│   ├── [Sun icon]        Today          → /dashboard/today
│   ├── [TrendingUp icon] Trends         → /dashboard/trends
│   ├── [BookOpen icon]   AI Insights    → /dashboard/ai-insights
│   └── [User icon]       Profile        → /dashboard/settings
└── [Lock icon] Privacy → /privacy (external link)
```

The active nav item uses `bg-green-500/10 text-green-400 border-l-2 border-green-400`.

---

### DashboardHeader (`apps/web/src/components/layout/DashboardHeader.tsx`)

```
Header (top bar, border-b border-slate-800)
├── Left: Page title (text-slate-100 font-semibold)
└── Right: Avatar circle → /dashboard/settings
    ├── If avatarUrl: Google profile photo (32px, rounded)
    └── Else: Initial letter in green circle
```

---

### Today Page (`/dashboard/today`)

```
<DashboardHeader title="Today" />
<main>
  ├── Date + last sync timestamp row
  └── 12-column grid:
      ├── [col-span-3] Focus Score card
      │   ├── FocusRing SVG (score ring)
      │   ├── Score number (large)
      │   ├── "pts" label
      │   └── Quality label (Excellent / Average / Room to grow)
      │
      ├── [col-span-6] Center column
      │   ├── Time Breakdown card
      │   │   ├── 3 cells: Productive / Breaks & Browsing / Neutral
      │   │   │   └── Each: icon, duration, label
      │   │   └── Stacked progress bar
      │   └── Today's Sites card
      │       └── List of top domains (up to 10)
      │           ├── Category icon
      │           ├── Domain name
      │           ├── Category label
      │           └── Duration
      │
      └── [col-span-3] Daily Insight card
          ├── If AI analysis exists:
          │   ├── FileText icon + "Daily Insight" header
          │   ├── "View All →" link to /dashboard/ai-insights
          │   ├── Analysis text
          │   └── Analysis date
          └── If no AI analysis:
              ├── "No insights yet" message
              └── "Go to Snapshots →" link
```

**Empty state** (no synced data): a 📭 icon, the text "No data synced yet", and instructions.

---

### Trends Page (`/dashboard/trends`)

```
<DashboardHeader title="Trends" />
<main>
  ├── Period selector: [Last 7 days] [Last 30 days]
  ├── Summary stats row (3 cards):
  │   ├── Avg Focus Score (green)
  │   ├── Total Productive Time (emerald)
  │   └── Total Breaks & Browsing (orange)
  ├── Activity Bar Chart card
  │   └── <ActivityBarChart /> — Recharts stacked bar chart
  └── Focus Score Line Chart card
      └── <FocusScoreChart /> — Recharts line chart with dashed reference
```

**Empty state:** a 📉 icon and the message "No trend data yet".

---

### AI Insights Page (`/dashboard/ai-insights`)

```
<DashboardHeader title="AI Insights" />
<main>
  └── 12-column grid:
      ├── [col-span-5] Generate Now card
      │   ├── Description text
      │   └── <AnalyzeButton /> (client component)
      │       ├── Idle: "Analyze Today"
      │       ├── Loading: spinner
      │       └── Success: "Done!" → router.refresh()
      │
      └── [col-span-7] Snapshot History
          ├── If no analyses: empty state with Lightbulb icon
          └── List of up to 30 analyses:
              └── Each card:
                  ├── Date (formatted, locale-aware)
                  ├── Analyzed timestamp
                  ├── Focus score badge (green/yellow/red)
                  └── Analysis text
```

---

### Settings / Profile Page (`/dashboard/settings`)

```
<DashboardHeader title="Profile" />
<main class="max-w-xl">
  ├── Section 1: Account
  │   ├── Avatar (Google photo or initial circle)
  │   ├── Full name (if available)
  │   ├── Email
  │   ├── "Connected via Google" badge
  │   └── <SignOutButton /> → signs out + redirects to /
  │
  ├── Section 2: Preferences (<SettingsForm />)
  │   ├── Language toggle: [English] [繁體中文]
  │   ├── Daily Email Report toggle (on/off)
  │   ├── Send Test Email button (if report enabled)
  │   ├── Daily Focus Goal slider (1h–12h)
  │   └── [Save Settings] button
  │
  ├── Section 3: Data Management
  │   ├── <ExportCloudDataButton /> — downloads JSON
  │   └── <DeleteCloudDataButton /> — with confirmation dialog
  │
  └── Section 4: About
      ├── App version (1.0.0)
      └── Links: Privacy Policy · Terms of Service · GitHub · Report Issue
```

---

### Login Page (`/login`)

```
Full-page centered layout:
├── EchoFocus logo + "Welcome back"
├── "Sign in to view your productivity dashboard"
├── [Sign in with Google] button (OAuth redirect)
└── Privacy note: "We only access your email address"
```

---

### Landing Page (`/`)

A full marketing page with:
- A hero section, feature highlights, the privacy differentiator, and a call-to-action button → /login

---

### Privacy Policy (`/privacy`) and Terms of Service (`/terms`)

Static server-rendered pages, each with:
- Navigation back to home
- A "Last Updated" date
- The legal text, section by section
- Cross-links between Privacy ↔ Terms

---

## 5. Navigation Map

```
Chrome Extension
─────────────────────────────────────────────────────────────────────
  [Extension Icon Click]
        │
        ▼
  ┌─────────────┐     [User icon]      ┌──────────────────────────┐
  │   POPUP     │ ──────────────────►  │  /dashboard/settings     │
  │             │                      │  (opens new tab)         │
  │  TrackingToggle                    └──────────────────────────┘
  │  FocusScoreRing
  │  StatsBar
  │  DomainList
  │  AiInsightCard
  └──────┬──────┘
         │ [Settings / Lightbulb icon]
         ▼
  ┌─────────────┐
  │   OPTIONS   │
  │  ┌────────┐ │
  │  │General │ │
  │  │Categ.  │ │
  │  │Privacy │ │
  │  │Account │ │
  │  │About   │ │
  │  └────────┘ │
  └─────────────┘

Web Dashboard
─────────────────────────────────────────────────────────────────────
  /                (Landing)
  ├── /login       (Google OAuth)
  │     └── /auth/callback  → /dashboard/today
  │
  └── /dashboard/
        ├── (redirect → /dashboard/today)
        │
        ├── today/          [Sun icon]
        │     └── "View All" link → /dashboard/ai-insights
        │
        ├── trends/         [TrendingUp icon]
        │     └── ?period=7 / ?period=30
        │
        ├── ai-insights/    [BookOpen icon]
        │
        └── settings/       [User icon / Avatar]
              (all sections on one page)

Sidebar (always visible in /dashboard/*):
  EchoFocus logo → /dashboard/today
  Sun     → /dashboard/today
  Trends  → /dashboard/trends
  AI      → /dashboard/ai-insights
  Profile → /dashboard/settings
  Lock    → /privacy

Header avatar → /dashboard/settings
```

---

## 6. Data Architecture

### chrome.storage.local (Extension, device only)

| Key | Type | Description |
|---|---|---|
| `entries:YYYY-MM-DD` | `TrackingEntry[]` | Raw tab events for the day |
| `aggregates:YYYY-MM-DD` | `DailyAggregate` | Computed daily summary |
| `tracking_state` | `TrackingState` | Current tab domain + startTime |
| `settings` | `Settings` | Idle timeout, daily goal |
| `custom_rules` | `ClassificationRule[]` | User-defined domain rules |
| `supabase_session` | `string` (JSON) | Supabase auth session |
| `last_sync_at` | `string` (ISO) | Timestamp of the last cloud sync |
| `ai_analysis:YYYY-MM-DD` | `AiAnalysisResult` | Cached AI analysis |
| `language` | `'en' \| 'zh-TW'` | Extension UI language |

### Supabase PostgreSQL Tables

#### `user_preferences`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid (PK) | FK → auth.users |
| `email_report_enabled` | boolean | Default true |
| `idle_timeout_minutes` | int | Default 2 |
| `data_retention_days` | int | Default 30 |
| `daily_goal_minutes` | int | Default 360 (6h) |
| `updated_at` | timestamptz | |

#### `synced_aggregates`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK → auth.users |
| `date` | date | |
| `total_seconds` | int | |
| `productive_seconds` | int | |
| `distraction_seconds` | int | |
| `neutral_seconds` | int | |
| `uncategorized_seconds` | int | |
| `focus_score` | int | 0 to 100 |
| `top_domains` | jsonb | `[{ domain, seconds, category }]`, with NO raw URLs |
| `synced_at` | timestamptz | |

#### `ai_analyses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | FK → auth.users |
| `date` | date | Analysis target date |
| `analysis_text` | text | Gemini-generated insight |
| `focus_score` | int | Score at the time of analysis |
| `created_at` | timestamptz | |

#### `custom_rules` (optional Supabase mirror)
The main copy lives in `chrome.storage.local`. The rules may sync to Supabase for cross-device use.

### Supabase Edge Functions

| Function | Trigger | Auth |
|---|---|---|
| `ai-analyze` | Manual (popup / web button) | User JWT |
| `send-email-report` | Cron + manual test | Service role / User JWT |

### Web Cookies

| Cookie | Purpose |
|---|---|
| `echofocus-lang` | Language preference (`en` or `zh-TW`) |
| `sb-*` (Supabase) | Auth session (managed by `@supabase/ssr`) |

---

## 7. Scheduled Events

The extension schedules its work with `chrome.alarms`, and the server uses Supabase cron.

### Extension Alarms (`background/alarms.ts`)

| Alarm name | Schedule | Action |
|---|---|---|
| `hourly-aggregate` | Every 60 minutes | Recompute `DailyAggregate` from raw entries |
| `midnight-sync` | Daily at 00:05 | Sync yesterday's aggregate to Supabase |
| `ai-analysis` | Daily at 21:00 | Run AI analysis for today (if the user opted in) |
| `cleanup` | Daily at 00:10 | Delete entries older than `data_retention_days` |

**Language for scheduled AI:** the alarm handler reads `chrome.storage.local['language']` when the alarm fires, so the analysis comes back in the language the user picked in the extension.

**Service worker resilience:** Chrome may terminate the service worker between alarms, so each alarm handler re-reads its state from `chrome.storage.local` when the worker wakes up.

### Server-Side Cron (Supabase)

| Function | Schedule | Action |
|---|---|---|
| `send-email-report` | Daily ~07:00 | Send the email report to all users with `email_report_enabled: true` |

---

*Generated from EchoFocus source code · Version 1.0.0*
