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
   - [WF-06 AI Analysis](#wf-06-ai-analysis)
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

EchoFocus is a productivity tracker that ships as a **Chrome Extension** (Manifest V3) with a companion **Web Dashboard** (Next.js 15). Google Gemini writes the AI analysis of each day's numbers.

| Concern | Where it lives |
|---|---|
| Raw browsing data (URLs, durations, per-site entries) | `chrome.storage.local` (**never leaves the device**) |
| Aggregated daily stats (domain names + seconds, no URLs) | Supabase `synced_aggregates` table |
| AI analysis results | Supabase `ai_analyses` table |
| User preferences | Supabase `user_preferences` table |
| Authentication | Supabase Auth (Google OAuth) |
| AI inference | Google Gemini API via Supabase Edge Function (server-side) |
| Email delivery | None: the email report is shelved, and the `send-email-report` Edge Function returns 503 |

**Core privacy guarantee:** Supabase receives only aggregated domain-level statistics, AI-generated text, and the user's preferences and site rules. Raw URLs, page titles, and the full browsing history stay on the user's device.

---

## 2. User Workflows

### WF-01 First Install & Onboarding

**Trigger:** The user loads the extension unpacked, for example from the GitHub release build. It is not on the Chrome Web Store yet.

**Steps:**

1. `chrome.runtime.onInstalled` fires with `reason === 'install'`.
2. The background service worker calls `chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding/index.html') })`.
3. The onboarding page opens in a full tab (`apps/extension/src/onboarding/App.tsx`).
4. The user goes through 4 steps. A header on every step holds a language toggle and a "Skip setup" button.
   - **Step 1 (Welcome):** a headline, a short description, three points (runs by itself, stays on your device, one minute a day), and a "Take the tour" button.
   - **Step 2 (How it works):** how tracking works, the three categories, and a worked example of the focus score.
   - **Step 3 (Privacy):** what stays local, what goes out for AI analysis (a daily summary), and what is never sent.
   - **Step 4 (Ready):** says tracking is already on and lists what signing in unlocks. "Sign in and open Settings" opens the Options page and closes the tab; "Keep it local-only for now" closes the tab.
5. The user can click the extension icon at any time to open the popup.

**Data flow:**
- Onboarding writes nothing. Sign-in happens later, from the popup or Options → Account (WF-02).

**End state:** Tracking runs with no account, and it starts on its own once the user browses.

---

### WF-02 Sign In (Extension)

**Trigger:** The user clicks the sign-in button under the popup header (shown only when signed out) or "Sign in with Google" in the Options → Account tab.

**Steps:**

1. The popup sends a `SIGN_IN` message, and the service worker runs `signInWithGoogle()` from `apps/extension/src/lib/auth.ts`. The popup closes when the auth window opens; on reopen it reads `signin_in_progress` and shows "Connecting…". The Options Account tab calls `signInWithGoogle()` itself.
2. `chrome.identity.launchWebAuthFlow` opens a Google consent window.
3. On success, the redirect URL carries the access and refresh tokens in its hash (implicit flow), and the extension passes them to `supabase.auth.setSession()`.
4. supabase-js writes the session JSON to `chrome.storage.local['supabase_session']`.
5. `postSignInBootstrap()` merges rules and preferences with the cloud, uploads the local aggregate archive (up to 365 days), and drains the sync queue.
6. The UI switches to the signed-in state: the popup drops its sign-in button, and the Account tab shows the email's initial, the email, and "Connected".

**End state:** The user is authenticated, and the sync and AI features become available. The web dashboard does not share this session: it signs in on its own through `/login` and holds its own Supabase session.

---

### WF-03 Daily Browsing Tracking

**Trigger:** Automatic. Tracking runs while the browser is open and the user is active.

**Steps:**

1. **Tab activated or URL changed:** `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` fire, and `background/index.ts` hands them to `background/tracker.ts`.
2. The tracker extracts the domain from the current URL.
3. If the **previous** tab ran for ≥ 5 seconds, the tracker saves its duration as a `TrackingEntry` to `chrome.storage.local['entries:YYYY-MM-DD']`.
4. A new tracking session begins, and the tracker stores the domain and `sessionStartTime` in `chrome.storage.local['tracking_state']`.
5. **Idle detection:** `chrome.idle.onStateChanged` fires when the user goes idle or locks the screen. The tracker pauses and saves the open session.
6. When the user comes back from idle, tracking restarts with a fresh `sessionStartTime`.
7. **Service worker restart:** when the worker wakes up, the tracker reads `tracking_state` from storage to rebuild the last known state.

**Categorization:** The tracker assigns each domain `productive` / `distraction` / `neutral` / `uncategorized`, based on two sources:
- Default rules in `packages/shared/src/constants/categories.ts` (100+ domains).
- The user's custom rules from `chrome.storage.local['custom_rules']`, which take the highest priority.

**Data flow:**
```
Tab event → tracker.ts → TrackingEntry → chrome.storage.local['entries:YYYY-MM-DD']
                       → DailyAggregate (each saved entry + hourly alarm) → chrome.storage.local['aggregates:YYYY-MM-DD']
```

**End state:** `entries:YYYY-MM-DD` grows through the day, and each saved entry and the hourly alarm recompute `aggregates:YYYY-MM-DD`.

---

### WF-04 View Today's Stats (Popup)

**Trigger:** The user clicks the EchoFocus extension icon.

**Steps:**

1. The popup mounts (`apps/extension/src/popup/App.tsx`).
2. It sends a `GET_TRACKING_STATE` message and gets back the tracker's `TrackingState` (`isTracking`, `isIdle`, the active domain and category, `sessionStartTime`). It polls `GET_CURRENT_SESSION` every second for `{ domain, category, elapsedSeconds }` and sends `GET_POMODORO` for the timer state.
3. It reads today's `DailyAggregate` straight from `chrome.storage.local['aggregates:YYYY-MM-DD']` (`hooks/useTodayStats.ts`).
4. It displays:
   - **TrackingToggle:** a pill in the header that reads "Tracking" or "Paused". Clicking it toggles tracking.
   - **Sign-in button:** shown under the header only when signed out (WF-02).
   - **StatusModule:** the shared pomodoro `TimerModule` (`packages/shared/src/ui`). Idle, it shows the focus score ring (0 to 100), today's total, and "Start focus"; during a round it shows a countdown ring with Pause/Resume, Skip, and End.
   - **CategoryColumns** (`StatsBar.tsx`): productive, Breaks & Browsing, and neutral durations.
   - **PopupWaveform:** 24 hourly bars of productive time.
   - **DomainList:** today's top 5 sites, each with a favicon, category dot, name, and duration. Clicking a row opens Options on the Categories tab with that domain filled in.
5. The footer holds the date, an EN/繁 language switch, a "View full analysis" button (opens `/dashboard/today` in a new tab), and a **gear** icon (opens `/dashboard/settings` in a new tab).

**Data flow:** The popup reads its numbers from `chrome.storage.local` and the service worker. When signed in, opening it makes the worker pull preferences from the cloud and check that the session is still valid, and the open popup sends `REFRESH_CLOUD_PREFS` every 2.5 seconds.

**End state:** The user sees today's browsing stats and can toggle tracking or run a focus timer.

---

### WF-05 Sync to Cloud

**Trigger:** Automatic (daily alarm at 00:05, plus a catch-up on browser startup and after sign-in) **or** manual (Options → Account → "Sync today's data" button).

**Steps:**

1. `runSync()` in `background/alarms.ts` calls `syncYesterdayAggregate()` from `apps/extension/src/lib/sync.ts`.
2. It adds yesterday's date to the `pending_sync_dates` queue, reconciles rules and preferences with the cloud, and calls `drainSyncQueue()`.
3. If the user is signed in, `drainSyncQueue()` reads each queued day's `chrome.storage.local['aggregates:YYYY-MM-DD']`. A date leaves the queue only after a confirmed upsert, so failed days retry on the next drain.
4. `sync.ts` upserts a row into the Supabase `synced_aggregates` table with these fields:
   - `user_id`, `date`, `total_seconds`, `productive_seconds`, `distraction_seconds`, `neutral_seconds`, `uncategorized_seconds`, `focus_score`, `top_domains` (JSONB array of `{ domain, seconds, category }`), `productive_by_hour` (24 productive-second counts), `synced_at`
5. It writes the current ISO timestamp to `chrome.storage.local['last_sync_at']`.

The manual button runs `syncAggregateForDate(today)`, which recomputes today's aggregate and upserts it the same way.

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

### WF-06 AI Analysis

**Trigger:** One of two paths, both of which need a signed-in account:
- The extension's daily alarm at 21:00 (`background/alarms.ts`). The popup has no analyze button.
- "Generate Insight" or "Regenerate" in the Daily insight block on the dashboard's Today page (`DailyInsight.tsx`), or the Weekly review on Trends (`WeeklyReview.tsx`).

**Steps (Extension alarm path):**

1. The `echofocus-ai-daily` alarm fires, and `runEveningSummary()` recomputes today's aggregate and sends the daily summary notification if it is turned on.
2. With less than 30 minutes tracked today, it stops there. Otherwise it reads `chrome.storage.local['language']` and calls `requestAiAnalysis(today, language)` from `lib/ai.ts`.
3. `ai.ts` stops if there is no session, then reads today's `DailyAggregate` from storage.
4. It builds an anonymized payload: `{ date, language, aggregate: { date, totalMinutes, productiveMinutes, distractionMinutes, neutralMinutes, focusScore, topDomains: [{ domain, minutes, category }] } }`, with the top 8 domains.
5. It POSTs the payload to the Supabase Edge Function `ai-analyze` with the user's auth token.
6. The Edge Function calls the Gemini API (`gemini-3.5-flash-lite`) with a structured prompt in the requested language (EN or zh-TW).
7. The Edge Function saves the result to the Supabase `ai_analyses` table.
8. It returns the analysis text and focus_score to the extension.
9. The extension saves the result to `chrome.storage.local['ai_analysis:YYYY-MM-DD']`.

**Steps (Web dashboard path):**

1. The user clicks "Generate Insight" or "Regenerate" on Today. The buttons appear only for dates the Edge Function still accepts.
2. `requestAiAnalysis()` in `apps/web/src/lib/ai.ts` reads the Supabase session and that date's `synced_aggregates` row, then builds the same payload.
3. It POSTs straight to the Edge Function `ai-analyze`.
4. On success, the Daily insight block shows the new text in place. When the daily cap is reached, the function answers 429 with the stored analysis, and the block shows that.
5. On Trends, `requestWeeklyAnalysis()` sends the 7 most recently synced days with `type: 'weekly'`; the function allows one weekly generation per week.

**Data flow:**
```
DailyAggregate (local) → ai.ts → Edge Function ai-analyze
  → Gemini API → analysis text
  → Supabase ai_analyses (saved server-side)
  → chrome.storage.local['ai_analysis:YYYY-MM-DD'] (saved client-side)
```

**End state:** The analysis appears in the Daily insight block on the dashboard's Today page. The extension keeps its local copy, but no extension screen displays it.

---

### WF-07 View AI Insights (Web)

**Trigger:** The user opens `/dashboard/today` for the daily insight or `/dashboard/trends` for the weekly review. `/dashboard/ai-insights` only redirects to Today.

**Steps:**

1. The Today server component fetches the `daily` row of `ai_analyses` for the date on screen.
2. `TodayReview` renders it in the Daily insight block (`DailyInsight.tsx`). With no row, the block offers "Generate Insight", or explains that the date is past the generation window.
3. The date arrows in the header (`?date=YYYY-MM-DD`) step to other synced days and their insights.
4. The Trends server component fetches the newest `weekly` analysis and renders it in `WeeklyReview.tsx` at the foot of the page.

**End state:** The user reads the daily insight for any synced day and the latest weekly review. There is no separate history list.

---

### WF-08 View Trends (Web)

**Trigger:** The user opens `/dashboard/trends`.

**Steps:**

1. A server component reads the `period` query param (`?period=7` or `?period=30`, default 7).
2. It fetches the newest rows from `synced_aggregates`, keeps the ones inside the period, and orders them by date ascending. It also fetches the newest weekly AI analysis.
3. It renders:
   - **Period selector:** "Last 7 days" and "Last 30 days" links in the header (Next.js `<Link>`).
   - **Focus score trend:** the period's average focus score beside the **Focus Score Line Chart** (`FocusScoreChart.tsx`), a line of the daily focus score against a dashed reference line at the 70-point target.
   - **Summary stats row:** Productive time, Breaks & Browsing, Days tracked, Best day.
   - **Activity Bar Chart** (`ActivityBarChart.tsx`): one stacked bar per day, with productive (green), distraction (orange), and neutral (gray).
   - **Best focus hours** (`FocusHours.tsx`) and the **Weekly review** (`WeeklyReview.tsx`).
4. With no data, the page shows an empty state with a line-chart icon.

**End state:** The user sees trends over the selected period.

---

### WF-09 Manage Custom Rules (Extension Options)

**Trigger:** The user opens Options (right-click the extension → Options), or clicks a site row in the popup, which opens this tab with that domain filled in. The popup's gear opens Dashboard Settings instead, and that page's footer points the user here for the extension-only settings.

**Steps:**

1. The Options page mounts (`apps/extension/src/options/App.tsx`) with a 5-tab layout.
2. The user opens the **類別** (Categories) tab.
3. The page loads the existing custom rules from `chrome.storage.local['custom_rules']`.
4. The user can:
   - **Add a rule:** enter a pattern, pick a match type (exact domain, wildcard, or path) and a category, and click "Add rule".
   - **Delete a rule:** click the delete icon on a rule row. Options has no edit action.
   - **Export or import rules** as a JSON file.
5. Each add, delete, or import sends a `SAVE_CUSTOM_RULES` message to the background.
6. The background writes the new rules to `chrome.storage.local['custom_rules']`.
7. The background calls `reclassifyToday()` so today's entries and the live session take the new categories, then `pushRules()` uploads the rules when signed in. The tracker reads the rules from storage each time a session starts.

**End state:** The new rules apply to today's entries at once and to every later tab change.

---

### WF-10 Configure Preferences (Web Settings)

**Trigger:** The user opens `/dashboard/settings`.

**Steps:**

1. A server component fetches the authenticated user's `user_preferences` row and `custom_rules` rows.
2. The page renders 5 tabs (`SettingsTabs.tsx`; `?tab=` picks one):
   - **General** (`SettingsForm.tsx`): language, theme (Light / Dark / Follow system), the daily focus goal, idle timeout, and data retention sliders, and the focus timer's focus duration, break duration, and end-of-round reminders.
   - **Categories** (`RulesEditor.tsx`): add, edit, and delete site rules in the cloud `custom_rules` table.
   - **Privacy:** an Export cloud data button and a Delete all cloud data button.
   - **Account:** avatar, name, email, "Connected via Google", and a Sign out button.
   - **About:** a short description, the app version, and links to the Privacy Policy, Terms, GitHub, and Report Issue.
   - A footer note says the tracking switch, offline rule editing, and local data export or deletion live in the extension's Options page.
3. The user changes preferences and clicks "Save settings".
4. `SettingsForm`'s `save()` upserts the changes into the Supabase `user_preferences` table. The extension picks them up on its next sync.
5. The language toggle calls `setLanguage()` from `useLocale()`, which writes the `echofocus-lang` cookie, and the page re-renders in the new language. The theme applies on click and saves `user_preferences.theme` without waiting for Save.

**End state:** Supabase holds the saved preferences, and a language change shows up right away.

---

### WF-11 Email Report

**Trigger:** None. The daily email report is shelved until a verified sending domain and a scheduler exist.

**Current state:**

1. `supabase/functions/send-email-report/index.ts` is a stub that answers every request with 503 ("Email reports are not available yet.").
2. The original implementation, which built an HTML report and sent it through Resend, is parked in `index.parked.ts`.
3. No cron or alarm calls the function.
4. Dashboard Settings has no email toggle and no test-email button; `SettingsForm.tsx` keeps them hidden.
5. Migration `007_email_shelved.sql` sets `user_preferences.email_report_enabled` to default false and turns it off on every existing row.

**End state:** No email is sent.

---

### WF-12 Data Export & Deletion

#### Export

**Trigger:** The user clicks "Download JSON" on the Export cloud data row in Settings → Privacy.

**Steps:**

1. `ExportCloudDataButton.tsx` fetches the last 30 days of `synced_aggregates` and `ai_analyses` from Supabase.
2. It merges them into one JSON object: `{ exported_at, range: 'last_30_days', synced_aggregates: [...], ai_analyses: [...] }`.
3. It creates a `Blob` and starts a browser file download (`echofocus-export-YYYY-MM-DD.json`).

#### Deletion

**Trigger:** The user clicks "Delete" on the Delete all cloud data row in Settings → Privacy.

**Steps:**

1. `DeleteCloudDataButton.tsx` opens an inline confirmation panel with "Confirm Delete" and "Cancel" buttons.
2. On confirm, it deletes all of the user's rows from `synced_aggregates` and `ai_analyses`.
3. Supabase RLS limits the delete to the authenticated user's rows.
4. On success the button is replaced by "All cloud data deleted" with a check mark, which stays. If either delete fails, the panel shows the error instead.

**Note:** This deletes cloud (Supabase) data only. Local `chrome.storage.local` data on the device has its own controls, in the extension's Options → Privacy tab.

---

## 3. UI Structure: Extension

### Popup (`apps/extension/src/popup/`)

```
App.tsx
├── Header bar
│   ├── EchoFocus icon + "EchoFocus"
│   └── TrackingToggle.tsx
│       ├── Accent pill "Tracking" (Eye icon) or outlined "Paused" (EyeOff icon)
│       ├── Click → sends TOGGLE_TRACKING to background
│       └── Tooltip: "Click to pause tracking" / "Click to resume tracking"
│
├── Sign-in button (signed out only)
│   └── Click → sends SIGN_IN; reads "Connecting…" while the flow runs
│
├── "Now:" row: category dot, current domain, elapsed m:ss
│
├── StatusModule.tsx → TimerModule (packages/shared/src/ui)
│   ├── Idle: score ring (0–100), "Today's total", [Start focus]
│   └── Running: countdown ring, [Pause]/[Resume] [Skip] [End], "Focus score N"
│
├── CategoryColumns (StatsBar.tsx)
│   └── Productive · Breaks & Browsing · Neutral (with durations)
│
├── PopupWaveform.tsx: 24 hourly bars of productive time
│
├── DomainList.tsx ("Today's sites")
│   ├── Top 5 domains
│   │   ├── Favicon
│   │   ├── Category dot
│   │   ├── Domain name (truncated)
│   │   └── Duration
│   ├── Row click → Options, Categories tab, domain filled in
│   └── Empty state: "No browsing activity recorded yet" + "Keep browsing..."
│
└── Footer
    ├── Date · [EN] [繁] language switch · "Idle" mark when idle
    ├── [View full analysis] → opens /dashboard/today in new tab
    └── [Gear icon] → opens /dashboard/settings in new tab
```

**Popup dimensions:** a fixed width (~360px), with scrolling content.

---

### Options Page (`apps/extension/src/options/`)

The page has a 5-tab layout (`App.tsx`):

```
Tab 1: 一般 (General)
├── Enable tracking toggle
├── Idle timeout slider (1–30 min)
├── Daily focus goal slider (1–12 hrs)
├── Data retention slider (7–365 days)
├── Daily summary toggle (21:00 Chrome notification)
├── Language: [English] [繁體中文]
└── [Save settings] button

Tab 2: 類別 (Categories)
├── Add rule form: [pattern input] + [match type select] + [category select] + [Add rule] button
├── Custom rules list
│   ├── Pattern + match type
│   ├── Category label
│   └── [Delete] action
└── Import & export: [Export rules] [Import rules] (JSON)

Tab 3: 隱私 (Privacy)
├── Local storage usage (MB used + bar)
├── Export data: range (All data / Last 30 days), [Export JSON] [Export CSV]
├── Links: Privacy Policy, Terms of Service
└── [Delete all tracking data] button (with confirmation)

Tab 4: 帳戶 (Account)
├── If signed in: email initial, email, "Connected", last sync time, history backup record,
│   [Sync today's data], web dashboard link, [Sign out]
└── If not signed in: [Sign in with Google] button

Tab 5: 關於 (About)
├── App version
├── Privacy protection list
├── Links: Privacy Policy, Terms of Service
└── "Report an issue" link
```

---

### Onboarding Page (`apps/extension/src/onboarding/`)

A 4-step wizard that fills a browser tab:

```
Every step: header with logo, [EN/繁] toggle, [Skip setup]; step progress bar; [Back] from step 2 on

Step 1: Welcome
├── Headline + description + EchoMark graphic
├── Three points: runs by itself · stays on your device · one minute a day
└── [Take the tour] button

Step 2: How it works
├── How tracking works (active tab, pauses on idle or a locked screen)
├── The three categories with an example day's focus score
└── [Next: your privacy] button

Step 3: Privacy
├── What stays local / what is sent for AI analysis (a daily summary)
├── "Never sent anywhere": full URLs, page titles, search queries, raw visit history
└── [Next: finish setup] button

Step 4: Ready
├── "Tracking is on" status
├── What signing in unlocks: web dashboard, daily insight, 30-day trends
├── [Keep it local-only for now] → closes the tab
└── [Sign in and open Settings] → opens the Options page, closes the tab
```

---

## 4. UI Structure: Web Dashboard

### Root Layout (`apps/web/src/app/dashboard/layout.tsx`)

```
<html>
  <body>
    <DashboardSidebar />         ← sticky left sidebar
    <div class="flex min-w-0 flex-1 flex-col">
      [page content renders here]
    </div>
  </body>
</html>
```

---

### DashboardSidebar (`apps/web/src/components/layout/DashboardSidebar.tsx`)

```
Sidebar (sticky, bg-canvas, w-16, md:w-52)
├── Logo: "EchoFocus" → /dashboard/today
├── Nav items (with active state highlight):
│   ├── [Sun icon]               Today's Overview → /dashboard/today
│   ├── [TrendingUp icon]        Trends           → /dashboard/trends
│   ├── [Compass icon]           Guide            → /dashboard/guide
│   └── [SlidersHorizontal icon] Settings         → /dashboard/settings
└── Footer: [EN] [繁] language switch + [Lock icon] "Browsing data stays on your device" (text, not a link)
```

The active nav item uses `bg-accent-subtle text-accent` with a 2px accent bar on its left edge.

---

### DashboardHeader (`apps/web/src/components/layout/DashboardHeader.tsx`)

```
Header (sticky top bar, border-b border-line)
├── Left: Page title (text-title text-content)
├── Right: page context (Today: date nav + sync time; Trends: period switch)
└── Right: Avatar circle → /dashboard/settings?tab=account
    ├── If avatarUrl: Google profile photo (28px, rounded)
    └── Else: Initial letter in an outlined circle
```

---

### Today Page (`/dashboard/today`)

```
<DashboardHeader title="Today's Overview" context={<DateNav />} />
  └── DateNav: [‹ previous day] date label · "Synced" time [next day ›]
<main>
  ├── TodayReview card
  │   ├── ScoreDial (focus score ring)
  │   ├── Total tracked + streak (when above 0)
  │   ├── 3 cells: Productive / Breaks & Browsing / Neutral
  │   │   └── Each: duration + share of the day
  │   ├── Stacked progress bar
  │   └── DailyInsight (Sparkles icon + "Daily insight")
  │       ├── If AI analysis exists: analysis text + [Regenerate]
  │       └── If no AI analysis: "No insight generated yet." + [Generate Insight]
  │
  ├── Focus by hour: <DayWaveform /> (24 bars), when the row has hourly data
  │
  └── SiteRanking: "Where the time went"
      └── Top 10 domains
          ├── Domain name
          ├── Bar (length = time, color = category)
          └── Duration
```

**Empty state** (no synced data): an inbox icon, the text "No synced data yet", and instructions.

---

### Trends Page (`/dashboard/trends`)

```
<DashboardHeader title="Trends" context={[Last 7 days] [Last 30 days]} />
<main>
  ├── Focus score trend
  │   ├── Period average focus score (large number)
  │   └── <FocusScoreChart /> — Recharts line chart with dashed reference at 70
  ├── Summary stats row (4 cells):
  │   ├── Productive time
  │   ├── Breaks & Browsing
  │   ├── Days tracked
  │   └── Best day
  ├── Daily time breakdown
  │   └── <ActivityBarChart /> — Recharts stacked bar chart
  ├── <FocusHours /> — best focus hours over the period
  └── <WeeklyReview /> — AI weekly review + generate / regenerate button
```

**Empty state:** a line-chart icon and the message "No trend data yet".

---

### AI Insights Page (`/dashboard/ai-insights`)

The route only redirects to `/dashboard/today`. The daily insight lives in Today's review card (`DailyInsight.tsx`), and the weekly review sits at the foot of Trends (`WeeklyReview.tsx`).

---

### Settings / Profile Page (`/dashboard/settings`)

```
<DashboardHeader title="Settings" />
<main>                         ← content column max-w-3xl
  ├── <SettingsTabs /> (?tab= picks the tab)
  │   ├── Tab 1: General (<SettingsForm />)
  │   │   ├── Language: [English] [繁體中文]
  │   │   ├── Theme: [Light] [Dark] [Follow system]
  │   │   ├── Daily Focus Goal slider (1h–12h)
  │   │   ├── Idle timeout slider (1–30 min)
  │   │   ├── Data retention slider (7–365 days)
  │   │   ├── Focus timer: focus duration, break duration, end-of-round reminders
  │   │   └── [Save settings] button
  │   │
  │   ├── Tab 2: Categories (<RulesEditor />) — add, edit, delete site rules
  │   │
  │   ├── Tab 3: Privacy
  │   │   ├── <ExportCloudDataButton /> — downloads JSON
  │   │   ├── <DeleteCloudDataButton /> — with inline confirmation
  │   │   └── Note: local data is exported or deleted in the extension
  │   │
  │   ├── Tab 4: Account
  │   │   ├── Avatar (Google photo or initial circle)
  │   │   ├── Full name (if available)
  │   │   ├── Email
  │   │   ├── "Connected via Google"
  │   │   └── <SignOutButton /> → signs out (global scope) + redirects to /
  │   │
  │   └── Tab 5: About
  │       ├── Short description
  │       ├── App version (1.0.0)
  │       └── Links: Privacy Policy · Terms of Service · GitHub · Report Issue
  │
  └── Footer note: extension-only settings live in the extension's Options page
```

---

### Login Page (`/login`)

```
Full-page centered layout:
├── EchoFocus logo + "Welcome back"
├── "Sign in to view your productivity dashboard"
├── [Sign in with Google] button (OAuth redirect)
└── Privacy note: "Sign in to view dashboard trends. All browsing data stays on your local device — never uploaded."
```

---

### Landing Page (`/`)

A full marketing page with:
- A hero section, feature highlights, the privacy differentiator, and call-to-action buttons → the GitHub release download and /login

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
  ┌─────────────┐     [Gear icon]      ┌──────────────────────────┐
  │   POPUP     │ ──────────────────►  │  /dashboard/settings     │
  │             │                      │  (opens new tab)         │
  │  TrackingToggle                    └──────────────────────────┘
  │  Sign-in button (signed out)
  │  StatusModule  [View full analysis] ──► /dashboard/today (new tab)
  │  CategoryColumns
  │  PopupWaveform
  │  DomainList
  └──────┬──────┘
         │ [Site row] → #categories/<domain>
         ▼
  ┌─────────────┐
  │   OPTIONS   │   (also: right-click the icon → Options)
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
        │     └── ?date=YYYY-MM-DD (previous / next day arrows)
        │
        ├── trends/         [TrendingUp icon]
        │     └── ?period=7 / ?period=30
        │
        ├── guide/          [Compass icon]
        │
        ├── settings/       [SlidersHorizontal icon / Avatar]
        │     └── ?tab=general / categories / privacy / account / about
        │
        ├── ai-insights/    (redirect → /dashboard/today)
        ├── profile/        (redirect → /dashboard/settings?tab=account)
        └── rules/          (redirect → /dashboard/settings?tab=categories)

Sidebar (always visible in /dashboard/*):
  EchoFocus logo → /dashboard/today
  Sun      → /dashboard/today
  Trends   → /dashboard/trends
  Compass  → /dashboard/guide
  Settings → /dashboard/settings

Header avatar → /dashboard/settings?tab=account
```

---

## 6. Data Architecture

### chrome.storage.local (Extension, device only)

| Key | Type | Description |
|---|---|---|
| `entries:YYYY-MM-DD` | `TrackingEntry[]` | Raw tab events for the day |
| `aggregates:YYYY-MM-DD` | `DailyAggregate` | Computed daily summary |
| `tracking_state` | `TrackingState` | Current tab domain + sessionStartTime |
| `settings` | `Settings` | Tracking switch, idle timeout, data retention, daily goal |
| `custom_rules` | `ClassificationRule[]` | User-defined domain rules |
| `supabase_session` | `string` (JSON) | Supabase auth session |
| `last_sync_at` | `string` (ISO) | Timestamp of the last cloud sync |
| `ai_analysis:YYYY-MM-DD` | `AiAnalysisResult` | Cached AI analysis |
| `language` | `'en' \| 'zh-TW'` | Extension UI language |

### Supabase PostgreSQL Tables

#### `user_preferences`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | FK → profiles, unique |
| `email_report_enabled` | boolean | Default false (migration 007); the email report is shelved |
| `idle_timeout_minutes` | int | Default 2 |
| `data_retention_days` | int | Default 30 |
| `daily_goal_minutes` | int | Default 360 (6h) |
| `theme` | text | `light` / `dark` / `system`, default `system` |
| `pomodoro_focus_minutes` | int | Default 25 |
| `pomodoro_break_minutes` | int | Default 5 |
| `pomodoro_reminders_enabled` | boolean | Default true |
| `updated_at` | timestamptz | |

#### `synced_aggregates`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | FK → profiles |
| `date` | date | |
| `total_seconds` | int | |
| `productive_seconds` | int | |
| `distraction_seconds` | int | |
| `neutral_seconds` | int | |
| `uncategorized_seconds` | int | |
| `focus_score` | int | 0 to 100 |
| `top_domains` | jsonb | `[{ domain, seconds, category }]`, with NO raw URLs |
| `productive_by_hour` | int[] | 24 productive-second counts, one per local hour |
| `synced_at` | timestamptz | |

#### `ai_analyses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | FK → profiles |
| `date` | date | Analysis target date (a weekly review uses its last day) |
| `type` | text | `daily` or `weekly` |
| `analysis_text` | text | Gemini-generated insight |
| `focus_score` | int | Score at the time of analysis |
| `created_at` | timestamptz | |

#### `custom_rules` (optional Supabase mirror)
Each device keeps its rules in `chrome.storage.local`. When the user is signed in, the rules sync to Supabase, the dashboard's Categories tab edits them there, and the cloud copy wins on reconcile.

### Supabase Edge Functions

| Function | Trigger | Auth |
|---|---|---|
| `ai-analyze` | Extension 21:00 alarm; dashboard Today insight and Trends weekly review buttons | User JWT |
| `send-email-report` | None (shelved stub that returns 503) | None |

### Web Cookies

| Cookie | Purpose |
|---|---|
| `echofocus-lang` | Language preference (`en` or `zh-TW`) |
| `echofocus-theme` | Theme preference (`light`, `dark`, or `system`) |
| `sb-*` (Supabase) | Auth session (managed by `@supabase/ssr`) |

---

## 7. Scheduled Events

The extension schedules its work with `chrome.alarms`. The server runs no scheduled jobs.

### Extension Alarms (`background/alarms.ts`)

| Alarm name | Schedule | Action |
|---|---|---|
| `echofocus-aggregate` | Every 60 minutes | Recompute today's `DailyAggregate` from raw entries |
| `echofocus-sync` | Daily at 00:05 | Queue yesterday, reconcile rules and preferences, and drain the sync queue to Supabase |
| `echofocus-ai-daily` | Daily at 21:00 | Send the daily summary notification (if turned on in Options), then run AI analysis for today (signed in, at least 30 minutes tracked) |
| `echofocus-cleanup` | Every 24 hours, first run 1 minute after install | Delete entries older than the retention setting, aggregates older than 365 days, and cached AI analyses older than 90 days |
| `echofocus-heartbeat` | Every minute | Record that the worker is alive and refresh the pomodoro badge |
| `echofocus-pomodoro` | When a focus or break round ends | Advance the pomodoro timer |

**Language for scheduled AI:** the alarm handler reads `chrome.storage.local['language']` when the alarm fires, so the analysis comes back in the language the user picked in the extension.

**Service worker resilience:** Chrome may terminate the service worker between alarms, so each alarm handler re-reads its state from `chrome.storage.local` when the worker wakes up.

### Server-Side Cron (Supabase)

None. Nothing in `supabase/` schedules a job. The daily email report that would have run on one is shelved (WF-11).

---

*Generated from EchoFocus source code · Version 1.0.0*
