# EchoFocus — Code Audit for Resume Writing

Verified against actual source code as of 2026-08-06. All numbers are cited with file:line references. Items that could not be confirmed are explicitly flagged rather than guessed.

---

## 1. Website Categorization / Tracking Logic

- **4 categories**: `productive`, `distraction`, `neutral`, `uncategorized` (`packages/shared/src/types/tracking.ts:1`)
- **277 pre-categorized domains** (`packages/shared/src/constants/categories.ts:6-365`)
  - productive: 153
  - distraction: 56
  - neutral: 68
  - Note: a comment in that file claims "120+" — actual count is 277.
- **Matching method: domain-list-based**, not keyword or AI-based. Custom user rules (exact / wildcard / path match) are checked first, then exact match against the default domain list, then progressively shorter subdomain matches, else `uncategorized` (`packages/shared/src/utils/categorize.ts:52-81`, rule types at lines 23-49, 98-102).
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
- **Events per day**: no explicit cap. A 5-second minimum-duration threshold gates whether a session is persisted as an entry (`apps/extension/src/background/tracker.ts:6,39,79`), and a 4-hour stale-session cap prevents runaway durations (`tracker.ts:37`). Actual daily entry count depends on real tab-switching behavior — cannot be quantified from code alone.

## 2. Gemini API Integration

- **Trigger: both scheduled and user-triggered.**
  - Scheduled: daily alarm at 21:00 (`apps/extension/src/background/alarms.ts:32-35`, handler at `alarms.ts:101-118`), skipped if less than 30 minutes of tracked data that day (`alarms.ts:107`).
  - User-triggered: "Analyze" button in popup → `REQUEST_AI_ANALYSIS` message → background handler (`apps/extension/src/popup/App.tsx:61-72`, `apps/extension/src/background/index.ts:160-184`).
- **Prompt templates: 1.** Only `buildPrompt()` in `supabase/functions/ai-analyze/index.ts:40-79`. No separate weekly-insight prompt/function exists anywhere in the repo.
- **Retry logic: absent.** Both the Edge Function (`ai-analyze/index.ts:81-123`) and the extension-side caller (`apps/extension/src/lib/ai.ts:60-92`) make a single `fetch` call each, with try/catch error handling (throws → caught → 500 response, or returns `null`), but no retry/backoff logic.

## 3. Manifest V3 Architecture

- **Permissions**: `["tabs", "storage", "alarms", "idle", "identity"]` — no `host_permissions`, no `<all_urls>` (`apps/extension/manifest.json`).
- **Content script: none.** No `content_scripts` entry in the manifest, no content-script source files in the repo.
- **Background service worker** handles 11 message types via its `onMessage` listener (`apps/extension/src/background/index.ts:107-204`): `GET_TRACKING_STATE`, `TOGGLE_TRACKING`, `GET_CURRENT_SESSION`, `GET_SETTINGS`, `SAVE_SETTINGS`, `GET_CUSTOM_RULES`, `SAVE_CUSTOM_RULES`, `GET_AI_ANALYSIS`, `REQUEST_AI_ANALYSIS`, `EXPORT_DATA`, `DELETE_ALL_DATA`, `GET_STORAGE_INFO`. It also wires tab-tracking to real Chrome events (`tabs.onActivated`, `tabs.onUpdated`, `windows.onFocusChanged`, `idle.onStateChanged`, `index.ts:68-84`).
- **Popup UI: 1 view.** A single scrolling dashboard composed of 5 sub-components (focus score ring, stats bar, domain list, tracking toggle, AI insight card) — not a tabbed/multi-screen popup (`apps/extension/src/popup/App.tsx`).
- **Options page: 5 tabs.** General, Categories, Privacy, Account, About (`apps/extension/src/options/App.tsx:758-802`).

## 4. Data Storage

- **Mechanism: `chrome.storage.local` only.** No IndexedDB usage anywhere in `apps/extension/src`.
- **Storage key patterns actually used** (`apps/extension/src/background/storage.ts`):
  - `entries:{date}`
  - `aggregates:{date}`
  - `tracking_state`
  - `settings`
  - `custom_rules`
  - `ai_analysis:{date}`
  - `language`
  - `supabase_session`
- **Cleanup / expiration logic exists**, runs on a daily alarm (`alarms.ts:14-17`, first run 1 minute after install, then every 24h): `cleanupOldData()` (`storage.ts:112-149`) removes entries older than the user-configurable retention setting (default 30 days), aggregates older than 365 days, and AI analyses older than 90 days.

## 5. Dashboard Visualization

- **Charting library: Recharts** `^2.14.1` (`apps/web/package.json`).
- **2 distinct chart types rendered**:
  - `BarChart` — `ActivityBarChart` component, rendered on the trends page (`apps/web/src/components/charts/ActivityBarChart.tsx`, `apps/web/src/app/dashboard/trends/page.tsx:3,112`)
  - `LineChart` — `FocusScoreChart` component, rendered on the trends page (`apps/web/src/components/charts/FocusScoreChart.tsx`, `apps/web/src/app/dashboard/trends/page.tsx:4,118`)
  - No pie, area, or radar charts exist anywhere in `apps/web/src`.

## 6. Feature Wiring Status

| Feature | Status | Notes |
|---|---|---|
| Tab tracking | ✅ Fully wired | Real Chrome event listeners drive it end to end |
| Categorization | ✅ Fully wired | Invoked on every tracked session |
| Gemini AI analysis | ✅ Fully wired | Both the popup button and the daily alarm call it |
| Supabase sync | ✅ Fully wired | Daily alarm uploads aggregated (domain + duration only) data |
| Dashboard charts | ✅ Fully wired | Both chart components confirmed imported and rendered |
| Email reports (Resend) | ⚠️ **Cannot determine** | The Edge Function (`supabase/functions/send-email-report/index.ts`) is complete, functional code, but no caller was found anywhere in the extension source or a repo-tracked cron config. It may be invoked via a Supabase dashboard-configured scheduled trigger that isn't stored as code in this repo. |

---

## Resume Bullet Points

- Built a Chrome Extension (Manifest V3) that passively tracks browser tab activity via service-worker event listeners, classifying visits into 4 categories using a 277-domain rule set with user-overridable custom matching (exact/wildcard/path).
- Implemented an on-device privacy model storing all browsing data in `chrome.storage.local` with automated retention-based cleanup (30/365/90-day policies), ensuring no raw URLs ever leave the user's machine.
- Integrated Google's Gemini API through a Supabase Edge Function to generate daily productivity summaries, triggered both on a scheduled alarm and on-demand by the user, with structured prompt-based analysis of aggregated (non-PII) usage data.
- Built a Next.js analytics dashboard using Recharts to visualize daily focus scores and activity breakdowns, backed by a Supabase-synced aggregation pipeline that uploads only domain-level durations, never full browsing history.

**Avoid claiming**: a "weekly insight" feature (doesn't exist), a specific "events per day" figure (not quantifiable from code), or "Architected" (not accurate — this is a well-built but conventional monorepo, not a novel architecture).
