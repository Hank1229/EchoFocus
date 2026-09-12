# EchoFocus — User Workflow & UI Structure

> Complete reference for every user-facing workflow, screen, component, and data flow in the EchoFocus Chrome Extension + Web Dashboard.
> Generated from source — kept in sync with code.

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
3. [UI Structure — Extension](#3-ui-structure--extension)
4. [UI Structure — Web Dashboard](#4-ui-structure--web-dashboard)
5. [Navigation Map](#5-navigation-map)
6. [Data Architecture](#6-data-architecture)
7. [Scheduled Events](#7-scheduled-events)

---

## 1. Product Overview

EchoFocus is an AI-powered productivity tracker built as a **Chrome Extension** (Manifest V3) with a companion **Web Dashboard** (Next.js 14).

| Concern | Where it lives |
|---|---|
| Raw browsing data (URLs, durations, per-site entries) | `chrome.storage.local` — **never leaves the device** |
| Aggregated daily stats (domain names + seconds, no URLs) | Supabase `synced_aggregates` table |
| AI analysis results | Supabase `ai_analyses` table |
| User preferences | Supabase `user_preferences` table |
| Authentication | Supabase Auth (Google OAuth) |
| AI inference | Google Gemini API via Supabase Edge Function (server-side) |
| Email delivery | Resend via Supabase Edge Function |

**Core privacy guarantee:** Supabase only ever receives aggregated domain-level statistics and AI-generated text. Raw URLs, page titles, and full browsing history never leave the user's device.

---

## 2. User Workflows

### WF-01 First Install & Onboarding

**Trigger:** User installs the extension from the Chrome Web Store (or loads it unpacked).

**Steps:**

1. `chrome.runtime.onInstalled` fires with `reason === 'install'`.
2. Background service worker calls `chrome.tabs.create({ url: onboarding.html })`.
3. A full-page onboarding tab opens (`apps/extension/src/onboarding/App.tsx`).
4. User progresses through 4 steps:
   - **Step 1 — Welcome:** Product name, tagline, "Get Started" CTA.
   - **Step 2 — Privacy:** Explains local-only storage, what goes to cloud, privacy-first design.
   - **Step 3 — Sign In:** Google OAuth button. Signs user in via `chrome.identity.launchWebAuthFlow`. On success, session is stored in `chrome.storage.local['supabase_session']`.
   - **Step 4 — Done:** Confirmation screen with link to open the popup and link to the web dashboard.
5. User can click the extension icon at any time to open the popup.

**Data flow:**
- Sign-in writes `supabase_session` to `chrome.storage.local`.
- `background/storage.ts` loads this session for all subsequent Supabase calls from the extension.

**End state:** Extension is authenticated; tracking begins automatically when user browses.

---

### WF-02 Sign In (Extension)

**Trigger:** User clicks "Sign in with Google" in the popup (if not already signed in), or in the Options → Account tab.

**Steps:**

1. UI calls `signInWithGoogle()` from `apps/extension/src/lib/auth.ts`.
2. `chrome.identity.launchWebAuthFlow` opens a Google consent popup.
3. On success, the OAuth code is exchanged for a Supabase session.
4. Session JSON is persisted to `chrome.storage.local['supabase_session']`.
5. UI updates to show the signed-in state (email, avatar).

**End state:** User is authenticated; sync and AI features are available.

---

### WF-03 Daily Browsing Tracking

**Trigger:** Automatic — starts when the browser is open and the user is active.

**Steps:**

1. **Tab activated / URL changed:** `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` fire in `background/tracker.ts`.
2. The tracker extracts the domain from the current URL.
3. Duration for the **previous** tab (if ≥ 5 seconds) is saved as a `TrackingEntry` to `chrome.storage.local['entries:YYYY-MM-DD']`.
4. New tracking session begins: domain + `startTime` stored in `chrome.storage.local['tracking_state']`.
5. **Idle detection:** `chrome.idle.onStateChanged` fires when the user is idle/locked. Tracker pauses and saves the open session.
6. On idle resume, tracking restarts with a fresh `startTime`.
7. **Service worker restart:** On wake-up, tracker reads `tracking_state` from storage to reconstruct the last known state.

**Categorization:** Each domain is categorized as `productive` / `distraction` / `neutral` / `uncategorized` using:
- Default rules in `packages/shared/src/constants/categories.ts` (100+ domains).
- User-defined custom rules from `chrome.storage.local['custom_rules']` (highest priority).

**Data flow:**
```
Tab event → tracker.ts → TrackingEntry → chrome.storage.local['entries:YYYY-MM-DD']
                       → DailyAggregate (hourly alarm) → chrome.storage.local['aggregates:YYYY-MM-DD']
```

**End state:** `entries:YYYY-MM-DD` accumulates throughout the day. Hourly alarm recomputes `aggregates:YYYY-MM-DD`.

---

### WF-04 View Today's Stats (Popup)

**Trigger:** User clicks the EchoFocus extension icon.

**Steps:**

1. Popup mounts (`apps/extension/src/popup/App.tsx`).
2. Sends `GET_TRACKING_STATE` message to background → receives `{ isTracking, domain, category, elapsedSeconds }`.
3. Reads today's `DailyAggregate` from storage via `GET_AGGREGATE` message.
4. Displays:
   - **TrackingToggle** — green pill showing "Tracking" or "Paused" with click-to-toggle.
   - **FocusScoreRing** — SVG ring with score (0–100), label (Excellent/Average/Room to grow), and pts.
   - **StatsBar** — horizontal stacked bar showing productive/distraction/neutral split with durations.
   - **DomainList** — top domains ranked by time with category icon, name, category label, duration.
   - **AiInsightCard** — last AI analysis summary (collapsible). If none, shows "Analyze" prompt.
5. Footer has: **Lightbulb** icon (opens options), **Settings** icon (opens options), **User** icon (opens `/dashboard/settings` in new tab).

**Data flow:** All data is read from `chrome.storage.local` — no network calls on popup open.

**End state:** User sees their browsing stats for today; can toggle tracking or trigger AI analysis.

---

### WF-05 Sync to Cloud

**Trigger:** Automatic (daily alarm at 00:05) **or** manual (Options → Account → "Sync Now" button).

**Steps:**

1. `runMidnightSync()` in `background/alarms.ts` fires.
2. Reads yesterday's `DailyAggregate` from `chrome.storage.local['aggregates:YYYY-MM-DD']`.
3. If aggregate exists and user is signed in, calls `syncToSupabase(aggregate)` from `apps/extension/src/lib/sync.ts`.
4. `sync.ts` upserts to Supabase `synced_aggregates` table:
   - `user_id`, `date`, `total_seconds`, `productive_seconds`, `distraction_seconds`, `neutral_seconds`, `uncategorized_seconds`, `focus_score`, `top_domains` (JSONB array of `{ domain, seconds, category }`)
5. Updates `chrome.storage.local['last_sync_at']` with current ISO timestamp.

**Privacy check:** Only aggregated domain-level data is sent. No raw URLs or page titles.

**Data flow:**
```
chrome.storage.local['aggregates:YYYY-MM-DD']
  → sync.ts
  → Supabase synced_aggregates (upsert)
  → chrome.storage.local['last_sync_at']
```

**End state:** Web dashboard can now display the day's data.

---

### WF-06 AI Analysis (Manual)

**Trigger:** User clicks "Analyze" in:
- The popup (`App.tsx` → AiInsightCard)
- The web dashboard AI Insights page (`AnalyzeButton.tsx`)

**Steps (Extension popup path):**

1. `handleAnalyze()` in popup sends `REQUEST_AI_ANALYSIS` message with `{ date, language }` to background.
2. `background/index.ts` receives message, calls `requestAiAnalysis(date, language)` from `lib/ai.ts`.
3. `ai.ts` reads today's `DailyAggregate` from storage.
4. Builds anonymized payload: `{ date, language, aggregate: { totalMinutes, productiveMinutes, distractionMinutes, neutralMinutes, topDomains: [{ domain, minutes, category }], focusScore } }`.
5. POSTs to Supabase Edge Function `ai-analyze` with user's auth token.
6. Edge Function calls Gemini API (`gemini-2.5-flash`) with a structured prompt (language-aware: EN or zh-TW).
7. Edge Function saves result to Supabase `ai_analyses` table.
8. Returns analysis text + focus_score to extension.
9. Extension saves to `chrome.storage.local['ai_analysis:YYYY-MM-DD']`.
10. Popup `AiInsightCard` displays the new analysis.

**Steps (Web dashboard path):**

1. User clicks "Analyze" on AI Insights page.
2. `AnalyzeButton.tsx` (client component) reads Supabase session.
3. POSTs directly to Edge Function `ai-analyze`.
4. On success, router refreshes to show new analysis in the history list.

**Data flow:**
```
DailyAggregate (local) → ai.ts → Edge Function ai-analyze
  → Gemini API → analysis text
  → Supabase ai_analyses (saved server-side)
  → chrome.storage.local['ai_analysis:YYYY-MM-DD'] (saved client-side)
```

**End state:** AI analysis appears in popup AiInsightCard and web AI Insights history.

---

### WF-07 View AI Insights (Web)

**Trigger:** User navigates to `/dashboard/ai-insights` in the web dashboard.

**Steps:**

1. Server component fetches last 30 AI analyses from `ai_analyses` table for the authenticated user.
2. Left panel — "Generate Now": shows `AnalyzeButton` client component.
3. Right panel — "Snapshot History": lists analyses with date, focus score badge, and analysis text.
4. Score badges are color-coded: green (≥70), yellow (≥40), red (<40).
5. Dates are formatted in the user's locale (EN or zh-TW).

**End state:** User sees their full AI analysis history and can generate a new snapshot.

---

### WF-08 View Trends (Web)

**Trigger:** User navigates to `/dashboard/trends`.

**Steps:**

1. Server component reads `period` query param (`?period=7` or `?period=30`, default 7).
2. Fetches matching rows from `synced_aggregates` ordered by date ascending.
3. Renders:
   - **Period selector** — "Last 7 days" / "Last 30 days" link buttons (client-side navigation via `<a>` tags).
   - **Summary stats row** — Avg Focus Score, Total Productive Time, Total Breaks & Browsing.
   - **Activity Bar Chart** (`ActivityBarChart.tsx`) — stacked bars: productive (green), distraction (orange), neutral (slate), per day.
   - **Focus Score Line Chart** (`FocusScoreChart.tsx`) — daily focus score line with dashed reference.
4. If no data, shows empty state with 📉 icon.

**End state:** User sees trends over the selected period.

---

### WF-09 Manage Custom Rules (Extension Options)

**Trigger:** User opens Options (right-click extension → Options, or gear icon in popup footer).

**Steps:**

1. Options page mounts (`apps/extension/src/options/App.tsx`), 5-tab layout.
2. User navigates to **類別** (Categories) tab.
3. Existing custom rules are loaded from `chrome.storage.local['custom_rules']`.
4. User can:
   - **Add rule:** Enter domain pattern + select category → "Add" button.
   - **Edit rule:** Click edit on existing rule row → modify → save.
   - **Delete rule:** Click delete icon on rule row.
5. On save, sends `SAVE_CUSTOM_RULES` message to background.
6. Background writes new rules to `chrome.storage.local['custom_rules']`.
7. Background calls `loadCustomRules()` so tracker uses new rules immediately.

**End state:** New rules take effect on the next tab change.

---

### WF-10 Configure Preferences (Web Settings)

**Trigger:** User navigates to `/dashboard/settings`.

**Steps:**

1. Server component fetches `user_preferences` row for the authenticated user.
2. Page renders 4 sections:
   - **Account:** Avatar, name, email, "Connected via Google" badge, Sign Out button.
   - **Preferences** (`SettingsForm.tsx`): Language toggle, Daily Email Report toggle, Send Test Email button, Daily Focus Goal slider.
   - **Data Management:** Export Cloud Data button, Delete All Cloud Data button.
   - **About:** App version, links to Privacy Policy, Terms, GitHub, Report Issue.
3. User changes preferences → clicks "Save Settings".
4. `SettingsForm.handleSave()` upserts to Supabase `user_preferences` table.
5. Language toggle calls `setLanguage()` from `useLocale()` → writes cookie `echofocus-lang` → page re-renders in new language.

**End state:** Preferences saved to Supabase; language change takes effect immediately.

---

### WF-11 Email Report

**Trigger:** Automatic daily cron (Supabase Edge Function scheduled at 07:00 user-local time) **or** manual test email from Settings.

**Steps:**

1. `send-email-report` Edge Function runs.
2. Reads user's `user_preferences` — if `email_report_enabled` is false, skips.
3. Fetches last 1 day's `synced_aggregates` row and last 7 days for average.
4. Fetches latest `ai_analyses` row.
5. Builds HTML email with:
   - EchoFocus branding.
   - Today's focus score (large, color-coded).
   - 7-day average comparison.
   - Time breakdown (productive / distraction / neutral).
   - Top 5 domains.
   - AI insight summary.
   - "Open Dashboard" CTA button.
6. Sends via Resend API to user's email.

**Manual test path:**
- User clicks "Send Test Report" in Settings.
- `SettingsForm.handleSendTestEmail()` POSTs to `send-email-report` Edge Function with user's auth token.
- Button shows: Sending → Sent ✓ / Failed (3 second display).

**End state:** Email delivered to user's inbox.

---

### WF-12 Data Export & Deletion

#### Export

**Trigger:** User clicks "Export Cloud Data (JSON)" in Settings → Data Management.

**Steps:**

1. `ExportCloudDataButton.tsx` fetches last 30 days of `synced_aggregates` and `ai_analyses` from Supabase.
2. Merges into a single JSON object `{ exported_at, synced_aggregates: [...], ai_analyses: [...] }`.
3. Creates a `Blob` and triggers browser file download (`echofocus-export-YYYY-MM-DD.json`).

#### Deletion

**Trigger:** User clicks "Delete All Cloud Data" in Settings → Data Management.

**Steps:**

1. `DeleteCloudDataButton.tsx` shows a confirmation dialog with typed confirmation.
2. On confirm, deletes all rows from `synced_aggregates` and `ai_analyses` for the user.
3. Supabase RLS ensures only the authenticated user's rows are deleted.
4. Button shows "✓ All cloud data deleted" for 3 seconds.

**Note:** This only deletes cloud (Supabase) data. Local `chrome.storage.local` data on the device is managed separately via the extension Options → Privacy tab.

---

## 3. UI Structure — Extension

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

**Popup dimensions:** Fixed width (~360px), scrollable.

---

### Options Page (`apps/extension/src/options/`)

5-tab layout (`App.tsx`):

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

4-step wizard (full browser tab):

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

## 4. UI Structure — Web Dashboard

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

Active nav item: `bg-green-500/10 text-green-400 border-l-2 border-green-400`

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

**Empty state** (no synced data): 📭 icon + "No data synced yet" + instructions.

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

**Empty state**: 📉 icon + "No trend data yet" message.

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

Full marketing page with:
- Hero section, feature highlights, privacy differentiator, CTA → /login

---

### Privacy Policy (`/privacy`) and Terms of Service (`/terms`)

Static server-rendered pages with:
- Navigation back to home
- "Last Updated" date
- Section-by-section legal text
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

### chrome.storage.local (Extension — device only)

| Key | Type | Description |
|---|---|---|
| `entries:YYYY-MM-DD` | `TrackingEntry[]` | Raw tab events for the day |
| `aggregates:YYYY-MM-DD` | `DailyAggregate` | Computed daily summary |
| `tracking_state` | `TrackingState` | Current tab domain + startTime |
| `settings` | `Settings` | Idle timeout, daily goal |
| `custom_rules` | `ClassificationRule[]` | User-defined domain rules |
| `supabase_session` | `string` (JSON) | Supabase auth session |
| `last_sync_at` | `string` (ISO) | Timestamp of last cloud sync |
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
| `focus_score` | int | 0–100 |
| `top_domains` | jsonb | `[{ domain, seconds, category }]` — NO raw URLs |
| `synced_at` | timestamptz | |

#### `ai_analyses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | FK → auth.users |
| `date` | date | Analysis target date |
| `analysis_text` | text | Gemini-generated insight |
| `focus_score` | int | Score at time of analysis |
| `created_at` | timestamptz | |

#### `custom_rules` (optional Supabase mirror)
Primarily stored in `chrome.storage.local`. May sync to Supabase for cross-device use.

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

All scheduled work uses `chrome.alarms` (extension) and Supabase cron (server).

### Extension Alarms (`background/alarms.ts`)

| Alarm name | Schedule | Action |
|---|---|---|
| `hourly-aggregate` | Every 60 minutes | Recompute `DailyAggregate` from raw entries |
| `midnight-sync` | Daily at 00:05 | Sync yesterday's aggregate to Supabase |
| `ai-analysis` | Daily at 21:00 | Run AI analysis for today (if user opted in) |
| `cleanup` | Daily at 00:10 | Delete entries older than `data_retention_days` |

**Language for scheduled AI:** Reads `chrome.storage.local['language']` at alarm time so the analysis language matches the user's extension setting.

**Service worker resilience:** All alarm handlers re-read state from `chrome.storage.local` on wake-up since the service worker may have been terminated between alarms.

### Server-Side Cron (Supabase)

| Function | Schedule | Action |
|---|---|---|
| `send-email-report` | Daily ~07:00 | Send email report to all users with `email_report_enabled: true` |

---

*Generated from EchoFocus source code · Version 1.0.0*
