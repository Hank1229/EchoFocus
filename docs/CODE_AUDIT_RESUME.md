# EchoFocus: Code Audit for Resume Writing

Figures re-verified against the current code on 2026-10-02. Every number below comes with a file:line reference. If the code could not confirm a claim, the entry says so instead of guessing.

---

## 1. Website Categorization / Tracking Logic

- **4 categories**: `productive`, `distraction`, `neutral`, `uncategorized` (`packages/shared/src/types/tracking.ts:1`)
- **277 pre-categorized domains** (`packages/shared/src/constants/categories.ts:6-365`)
  - productive: 153
  - distraction: 56
  - neutral: 68
  - Note: a comment in that file claims "120+", but the list holds 277.
- **Matching method: a domain list.** No keyword or AI matching. The categorizer checks custom user rules (exact / wildcard / path match) first, then looks for an exact match in the default domain list, then drops one subdomain label at a time and checks each shorter base domain, and falls back to `uncategorized` (`packages/shared/src/utils/categorize.ts:58-87`, rule types at lines 28-55, 98-138).
- **TrackingEntry data structure** (`packages/shared/src/types/tracking.ts:3-12`):
  ```ts
  export interface TrackingEntry {
    id: string
    domain: string
    url: string
    title: string
    category: Category
    startTime: number  // Unix timestamp ms
    duration: number   // seconds
    date: string        // YYYY-MM-DD
  }
  ```
- **Events per day**: no explicit cap. The tracker saves a session as an entry only if it lasted at least 5 seconds (`apps/extension/src/background/tracker.ts:23,178,212`), and it caps a stale session at 4 hours so a duration can't run away (`tracker.ts:37`). The daily entry count depends on how often the user switches tabs, so the code alone can't put a number on it.

## 2. Gemini API Integration

- **Trigger: scheduled and user-triggered.**
  - Scheduled: a daily alarm at 21:00 (`apps/extension/src/background/alarms.ts:39-43`, handler at `alarms.ts:143-169`). The handler skips the run if the day has less than 30 minutes of tracked data (`alarms.ts:156`).
  - User-triggered: the generate and regenerate buttons on the dashboard, for the daily insight on Today (`apps/web/src/app/dashboard/today/DailyInsight.tsx:26-48`) and the weekly review on Trends (`apps/web/src/app/dashboard/trends/WeeklyReview.tsx:22-44`). Both post to the Edge Function through `apps/web/src/lib/ai.ts:125-176`. The popup has no Analyze button; the background still handles a `REQUEST_AI_ANALYSIS` message (`apps/extension/src/background/index.ts:223-247`), but no extension page sends it.
- **Prompt templates: 2.** `buildPrompt()` for the daily insight (`supabase/functions/ai-analyze/index.ts:148-186`) and `buildWeeklyPrompt()` for the weekly review (`index.ts:194-243`). Each one tells Gemini to answer in English or Traditional Chinese (`index.ts:157-159`, `index.ts:214-216`).
- **Retry logic: none for a failed generation.** The Edge Function's `callGemini()` (`ai-analyze/index.ts:246-308`) makes one `fetch` call with a 20-second timeout, and a failure returns a 502 (`index.ts:504-508`). The extension-side caller (`apps/extension/src/lib/ai.ts:77-141`) retries once, only after a 401, with a refreshed session token (`ai.ts:95-106`); any other failure returns a reason code. The dashboard caller (`apps/web/src/lib/ai.ts:59-119`) makes one `fetch` call. None of them backs off.

## 3. Manifest V3 Architecture

- **Permissions**: `["tabs", "storage", "alarms", "idle", "identity", "notifications", "favicon"]`, with no `host_permissions` and no `<all_urls>` (`apps/extension/manifest.json`).
- **Content script: none.** The manifest has no `content_scripts` entry, and the repo has no content-script source files.
- **Background service worker** handles 16 message types through its `onMessage` listener (`apps/extension/src/background/index.ts:141-152`, switch in `handleMessage()` at `index.ts:162-302`): `GET_TRACKING_STATE`, `TOGGLE_TRACKING`, `GET_CURRENT_SESSION`, `GET_SETTINGS`, `SAVE_SETTINGS`, `GET_CUSTOM_RULES`, `SAVE_CUSTOM_RULES`, `GET_AI_ANALYSIS`, `REQUEST_AI_ANALYSIS`, `EXPORT_DATA`, `DELETE_ALL_DATA`, `GET_STORAGE_INFO`, `REFRESH_CLOUD_PREFS`, `SIGN_IN`, `GET_POMODORO`, `POMODORO_COMMAND`. The worker also connects tab tracking to live Chrome events (`tabs.onActivated`, `tabs.onUpdated`, `windows.onFocusChanged`, `idle.onStateChanged`, `index.ts:104-124`).
- **Popup UI: 1 view.** One scrolling dashboard built from 6 sub-components (status module with the focus score ring and the pomodoro timer from `packages/shared/src/ui/TimerModule.tsx`, category columns, hourly focus waveform, domain list, tracking toggle, category dot), with no tabs or extra screens and no AI insight card (`apps/extension/src/popup/App.tsx`, `apps/extension/src/popup/components/`).
- **Options page: 5 tabs.** General, Categories, Privacy, Account, About (`apps/extension/src/options/App.tsx:977-1019`).

## 4. Data Storage

- **Mechanism: `chrome.storage.local`.** Nothing in `apps/extension/src` uses IndexedDB. The one other store is a `localStorage` mirror of the theme choice, read before first paint (`apps/extension/src/lib/theme.ts:26-27`).
- **Storage key patterns in use** (`apps/extension/src/background/storage.ts:15-31`, except where noted):
  - `entries:{date}`
  - `aggregates:{date}`
  - `tracking_state`
  - `settings`
  - `custom_rules`
  - `ai_analysis:{date}`
  - `language` (`apps/extension/src/lib/i18n.tsx:29,43`)
  - `supabase_session` (`apps/extension/src/lib/supabase.ts:8`)
  - `storage.ts` also keeps `last_seen_at`, `storage_full_at`, and `favicon_cache`; the pomodoro, sync, settings-sync, sign-in, notification, and theme modules keep their own keys.
- **Cleanup / expiration logic** runs on a daily alarm (`alarms.ts:21-25`; first run 1 minute after install, then every 24h). `cleanupOldData()` (`storage.ts:309-342`) removes entries older than the user's retention setting (default 30 days), aggregates older than 365 days, and AI analyses older than 90 days.

## 5. Dashboard Visualization

- **Charting library: Recharts** `^2.15.4` (`apps/web/package.json`).
- **2 Recharts chart types rendered**:
  - `BarChart`: the `ActivityBarChart` component, rendered on the trends page (`apps/web/src/components/charts/ActivityBarChart.tsx`, `apps/web/src/app/dashboard/trends/TrendsView.tsx:3,95`)
  - `AreaChart`: the `FocusScoreChart` component, rendered on the trends page (`apps/web/src/components/charts/FocusScoreChart.tsx`, `apps/web/src/app/dashboard/trends/TrendsView.tsx:4,70`)
  - `apps/web/src` contains no pie, line, or radar charts. The focus-hours heat strip (`apps/web/src/app/dashboard/trends/FocusHours.tsx`) and the score dial (`apps/web/src/components/dashboard/ScoreDial.tsx`) are hand-built markup and SVG, not Recharts.

## 6. Feature Wiring Status

| Feature | Status | Notes |
|---|---|---|
| Tab tracking | Wired end to end | Live Chrome event listeners drive it |
| Categorization | Wired end to end | Runs on every tracked session |
| Gemini AI analysis | Wired end to end | The daily 21:00 alarm and the dashboard's insight buttons both call it |
| Supabase sync | Wired end to end | A daily alarm uploads aggregated data (domain + duration only) |
| Dashboard charts | Wired end to end | Confirmed: both chart components are imported and rendered |
| Email reports (Resend) | **Shelved** | The Edge Function (`supabase/functions/send-email-report/index.ts:15-23`) is a stub that answers every request with a 503; the real implementation is parked in `index.parked.ts`. Migration 007 sets `email_report_enabled` to false by default (`supabase/migrations/007_email_shelved.sql:7-8`), and no UI offers email settings (`apps/web/src/app/dashboard/settings/SettingsForm.tsx:10-12`). |

---

## Resume Bullet Points

- Built a Chrome Extension (Manifest V3) that tracks browser tab activity in the background through service-worker event listeners and sorts each visit into 4 categories with a 277-domain rule set, which users can override with custom matching (exact/wildcard/path).
- Implemented an on-device privacy model that keeps all browsing data in `chrome.storage.local`, prunes it on an automated retention schedule (30/365/90-day policies), and never lets raw URLs leave the user's machine.
- Integrated Google's Gemini API through a Supabase Edge Function that writes daily and weekly productivity summaries from structured prompts over aggregated (non-PII) usage data, triggered by a scheduled alarm or on demand by the user.
- Built a Next.js analytics dashboard with Recharts that charts daily focus scores and activity breakdowns, fed by a Supabase-synced aggregation pipeline that uploads domain-level durations and no full browsing history.

**Avoid claiming**: a specific "events per day" figure (the code can't produce one), or "Architected" (inaccurate: the project is a well-built but conventional monorepo with no novel architecture).
