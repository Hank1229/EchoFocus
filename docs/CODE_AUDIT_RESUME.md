# EchoFocus: Code Audit for Resume Writing

Checked against the source code as of 2026-08-06. Every number below comes with a file:line reference. If the code could not confirm a claim, the entry says so instead of guessing.

---

## 1. Website Categorization / Tracking Logic

- **4 categories**: `productive`, `distraction`, `neutral`, `uncategorized` (`packages/shared/src/types/tracking.ts:1`)
- **277 pre-categorized domains** (`packages/shared/src/constants/categories.ts:6-365`)
  - productive: 153
  - distraction: 56
  - neutral: 68
  - Note: a comment in that file claims "120+", but the list holds 277.
- **Matching method: a domain list.** No keyword or AI matching. The categorizer checks custom user rules (exact / wildcard / path match) first, then looks for an exact match in the default domain list, then drops one subdomain label at a time and checks each shorter base domain, and falls back to `uncategorized` (`packages/shared/src/utils/categorize.ts:52-81`, rule types at lines 23-49, 98-102).
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
- **Events per day**: no explicit cap. The tracker saves a session as an entry only if it lasted at least 5 seconds (`apps/extension/src/background/tracker.ts:6,39,79`), and it caps a stale session at 4 hours so a duration can't run away (`tracker.ts:37`). The daily entry count depends on how often the user switches tabs, so the code alone can't put a number on it.

## 2. Gemini API Integration

- **Trigger: scheduled and user-triggered.**
  - Scheduled: a daily alarm at 21:00 (`apps/extension/src/background/alarms.ts:32-35`, handler at `alarms.ts:101-118`). The handler skips the run if the day has less than 30 minutes of tracked data (`alarms.ts:107`).
  - User-triggered: the "Analyze" button in the popup → `REQUEST_AI_ANALYSIS` message → background handler (`apps/extension/src/popup/App.tsx:61-72`, `apps/extension/src/background/index.ts:160-184`).
- **Prompt templates: 1.** `buildPrompt()` in `supabase/functions/ai-analyze/index.ts:40-79` is the only one. The repo has no separate weekly-insight prompt or function.
- **Retry logic: absent.** The Edge Function (`ai-analyze/index.ts:81-123`) and the extension-side caller (`apps/extension/src/lib/ai.ts:60-92`) each make one `fetch` call inside try/catch error handling (throws → caught → 500 response, or returns `null`). Neither one retries or backs off.

## 3. Manifest V3 Architecture

- **Permissions**: `["tabs", "storage", "alarms", "idle", "identity"]`, with no `host_permissions` and no `<all_urls>` (`apps/extension/manifest.json`).
- **Content script: none.** The manifest has no `content_scripts` entry, and the repo has no content-script source files.
- **Background service worker** handles 11 message types through its `onMessage` listener (`apps/extension/src/background/index.ts:107-204`): `GET_TRACKING_STATE`, `TOGGLE_TRACKING`, `GET_CURRENT_SESSION`, `GET_SETTINGS`, `SAVE_SETTINGS`, `GET_CUSTOM_RULES`, `SAVE_CUSTOM_RULES`, `GET_AI_ANALYSIS`, `REQUEST_AI_ANALYSIS`, `EXPORT_DATA`, `DELETE_ALL_DATA`, `GET_STORAGE_INFO`. The worker also connects tab tracking to live Chrome events (`tabs.onActivated`, `tabs.onUpdated`, `windows.onFocusChanged`, `idle.onStateChanged`, `index.ts:68-84`).
- **Popup UI: 1 view.** One scrolling dashboard built from 5 sub-components (focus score ring, stats bar, domain list, tracking toggle, AI insight card), with no tabs or extra screens (`apps/extension/src/popup/App.tsx`).
- **Options page: 5 tabs.** General, Categories, Privacy, Account, About (`apps/extension/src/options/App.tsx:758-802`).

## 4. Data Storage

- **Mechanism: `chrome.storage.local` only.** Nothing in `apps/extension/src` uses IndexedDB.
- **Storage key patterns in use** (`apps/extension/src/background/storage.ts`):
  - `entries:{date}`
  - `aggregates:{date}`
  - `tracking_state`
  - `settings`
  - `custom_rules`
  - `ai_analysis:{date}`
  - `language`
  - `supabase_session`
- **Cleanup / expiration logic** runs on a daily alarm (`alarms.ts:14-17`; first run 1 minute after install, then every 24h). `cleanupOldData()` (`storage.ts:112-149`) removes entries older than the user's retention setting (default 30 days), aggregates older than 365 days, and AI analyses older than 90 days.

## 5. Dashboard Visualization

- **Charting library: Recharts** `^2.14.1` (`apps/web/package.json`).
- **2 chart types rendered**:
  - `BarChart`: the `ActivityBarChart` component, rendered on the trends page (`apps/web/src/components/charts/ActivityBarChart.tsx`, `apps/web/src/app/dashboard/trends/page.tsx:3,112`)
  - `LineChart`: the `FocusScoreChart` component, rendered on the trends page (`apps/web/src/components/charts/FocusScoreChart.tsx`, `apps/web/src/app/dashboard/trends/page.tsx:4,118`)
  - `apps/web/src` contains no pie, area, or radar charts.

## 6. Feature Wiring Status

| Feature | Status | Notes |
|---|---|---|
| Tab tracking | Wired end to end | Live Chrome event listeners drive it |
| Categorization | Wired end to end | Runs on every tracked session |
| Gemini AI analysis | Wired end to end | The popup button and the daily alarm both call it |
| Supabase sync | Wired end to end | A daily alarm uploads aggregated data (domain + duration only) |
| Dashboard charts | Wired end to end | Confirmed: both chart components are imported and rendered |
| Email reports (Resend) | **Cannot determine** | The Edge Function (`supabase/functions/send-email-report/index.ts`) is complete, working code, but the extension source and the cron configs tracked in the repo contain no caller. A scheduled trigger set up in the Supabase dashboard could call it without leaving any code in this repo. |

---

## Resume Bullet Points

- Built a Chrome Extension (Manifest V3) that tracks browser tab activity in the background through service-worker event listeners and sorts each visit into 4 categories with a 277-domain rule set, which users can override with custom matching (exact/wildcard/path).
- Implemented an on-device privacy model that keeps all browsing data in `chrome.storage.local`, prunes it on an automated retention schedule (30/365/90-day policies), and never lets raw URLs leave the user's machine.
- Integrated Google's Gemini API through a Supabase Edge Function that writes daily productivity summaries from a structured prompt over aggregated (non-PII) usage data, triggered by a scheduled alarm or on demand by the user.
- Built a Next.js analytics dashboard with Recharts that charts daily focus scores and activity breakdowns, fed by a Supabase-synced aggregation pipeline that uploads domain-level durations and no full browsing history.

**Avoid claiming**: a "weekly insight" feature (it doesn't exist), a specific "events per day" figure (the code can't produce one), or "Architected" (inaccurate: the project is a well-built but conventional monorepo with no novel architecture).
