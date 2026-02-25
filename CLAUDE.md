# CLAUDE.md — EchoFocus Development Guide

> This file is the primary reference for Claude Code when building and modifying this project.
> Read the full PRD (docs/PRD.md) for product context and feature specifications.

---

## Project Overview

EchoFocus is an AI-powered smart productivity tracker built as a Chrome Extension. It automatically tracks browsing behavior, uses Google Gemini AI to analyze work patterns, and delivers personalized productivity insights and daily reports. As a key trust differentiator, ALL browsing data stays on the user's device (chrome.storage.local) — never uploaded to any server. The backend (Supabase) only stores user preferences, auth, and AI analysis results — NEVER raw browsing data or URLs.

---

## Repository Structure

```
echofocus/
├── CLAUDE.md                    # ← You are here
├── docs/
│   └── PRD.md                   # Full product requirements
├── packages/
│   └── shared/                  # Shared TypeScript types & utilities
│       ├── src/
│       │   ├── types/           # Shared type definitions
│       │   │   ├── tracking.ts  # TrackingEntry, DailyAggregate, Category
│       │   │   ├── rules.ts     # ClassificationRule, MatchType
│       │   │   ├── user.ts      # UserProfile, UserPreferences
│       │   │   └── index.ts
│       │   ├── constants/       # Shared constants
│       │   │   ├── categories.ts # Default domain categorizations
│       │   │   └── index.ts
│       │   └── utils/           # Shared utility functions
│       │       ├── categorize.ts # URL categorization logic
│       │       ├── aggregate.ts  # Data aggregation helpers
│       │       └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── extension/               # Chrome Extension (Vite + CRXJS + React)
│   │   ├── src/
│   │   │   ├── background/      # Service Worker
│   │   │   │   ├── index.ts     # Main service worker entry
│   │   │   │   ├── tracker.ts   # Tab tracking logic
│   │   │   │   ├── storage.ts   # chrome.storage.local operations
│   │   │   │   └── alarms.ts    # Scheduled tasks (cleanup, sync)
│   │   │   ├── popup/           # Extension popup (React)
│   │   │   │   ├── App.tsx
│   │   │   │   ├── components/
│   │   │   │   └── hooks/
│   │   │   ├── options/         # Options page (React)
│   │   │   │   ├── App.tsx
│   │   │   │   ├── pages/
│   │   │   │   └── components/
│   │   │   ├── lib/             # Extension-specific utilities
│   │   │   │   ├── supabase.ts  # Supabase client for extension
│   │   │   │   └── ai.ts       # AI analysis request handler
│   │   │   └── assets/          # Icons, images
│   │   │       ├── icon-16.png
│   │   │       ├── icon-48.png
│   │   │       └── icon-128.png
│   │   ├── manifest.json        # Manifest V3
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                     # Web Dashboard (Next.js 14)
│       ├── src/
│       │   ├── app/             # Next.js App Router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx     # Landing page
│       │   │   ├── login/
│       │   │   ├── dashboard/
│       │   │   │   ├── page.tsx         # Overview
│       │   │   │   ├── today/
│       │   │   │   ├── trends/
│       │   │   │   ├── ai-insights/
│       │   │   │   └── settings/
│       │   │   ├── privacy/
│       │   │   └── terms/
│       │   ├── components/      # React components
│       │   │   ├── ui/          # shadcn/ui components
│       │   │   ├── charts/      # Recharts wrappers
│       │   │   └── layout/      # Header, sidebar, etc.
│       │   └── lib/
│       │       ├── supabase/    # Supabase client (server + client)
│       │       └── utils/
│       ├── tailwind.config.js
│       ├── next.config.js
│       ├── tsconfig.json
│       └── package.json
├── supabase/                    # Supabase configuration
│   ├── migrations/              # Database migrations
│   ├── functions/               # Edge Functions
│   │   ├── ai-analyze/          # Gemini API proxy
│   │   │   └── index.ts
│   │   └── send-email-report/   # Daily email via Resend
│   │       └── index.ts
│   └── config.toml
├── package.json                 # Root workspace
├── pnpm-workspace.yaml
└── turbo.json                   # Turborepo config (optional)
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Monorepo | pnpm workspaces | Simple, fast, no extra config |
| Extension | Vite + CRXJS + React + TypeScript | Best DX for Chrome Extension dev |
| Extension UI | React + Tailwind CSS | Consistent with web dashboard |
| Web Dashboard | Next.js 14 (App Router) | SSR, great DX, free Vercel hosting |
| Web UI | Tailwind CSS + shadcn/ui + Recharts | Professional look, chart support |
| Backend | Supabase (Auth + DB + Edge Functions) | Zero backend management |
| Database | PostgreSQL (via Supabase) | Reliable, RLS built-in |
| AI | Google Gemini API (gemini-2.0-flash) | Fast, cheap, good quality |
| Email | Resend | Great DX, generous free tier |
| Package Manager | pnpm | Fast, disk efficient |

---

## Critical Rules

### Privacy (MOST IMPORTANT)

1. **NEVER send raw URLs, page titles, or full browsing history to any server**
2. **NEVER store browsing data in Supabase** — only user preferences, auth, and AI analysis results
3. **AI analysis input must be aggregated** — only domain names + durations + categories, NEVER full URLs
4. **All browsing data lives in chrome.storage.local** — the user's device only
5. When displaying privacy-related UI, be explicit about what data goes where

### Chrome Extension (Manifest V3)

1. Use **minimal permissions**: `tabs`, `storage`, `alarms`, `idle` — nothing more
2. **NO `host_permissions` for `<all_urls>`** — we only read tab info from the `tabs` API
3. Background must be a **Service Worker** (not a persistent background page)
4. Service Worker can be terminated at any time — persist state to chrome.storage
5. Use `chrome.storage.local` for browsing data, `chrome.storage.sync` for settings
6. Handle the **5MB quota** for chrome.storage.local — implement cleanup

### Code Style

1. **TypeScript strict mode** everywhere — no `any` types unless absolutely necessary
2. Use **functional React components** with hooks
3. Use **async/await** over raw Promises
4. **Error handling**: every async operation needs try/catch with user-friendly error messages
5. **Comments in English**, UI text in **Traditional Chinese (zh-TW)** by default (with i18n readiness)
6. File naming: `kebab-case` for files, `PascalCase` for React components
7. Use **Zod** for runtime validation of external data (API responses, storage reads)
8. Export shared types from `packages/shared` — don't duplicate type definitions

### Supabase

1. **Row Level Security (RLS)** on ALL tables — users can only access their own data
2. Use **Supabase Auth** helpers for both extension and web app
3. Edge Functions for server-side logic (AI proxy, email sending)
4. Database migrations in `supabase/migrations/` — never modify schema manually

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev:extension     # Build extension in watch mode
pnpm dev:web           # Start Next.js dev server
pnpm dev               # Run both

# Build
pnpm build:extension   # Production build → apps/extension/dist/
pnpm build:web         # Production build → apps/web/.next/
pnpm build             # Build all

# Type checking
pnpm typecheck         # Check all packages

# Supabase
pnpm supabase:start    # Start local Supabase
pnpm supabase:migrate  # Run migrations
pnpm supabase:gen      # Generate TypeScript types from DB schema
```

---

## Environment Variables

### Extension (apps/extension/.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Web Dashboard (apps/web/.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server-side only
```

### Supabase Edge Functions (supabase/.env)
```
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
```

---

## Key Implementation Details

### Tab Tracking (background/tracker.ts)

```typescript
// Pseudocode for the core tracking logic
// IMPORTANT: Service worker can be killed at any time
// Always persist state to chrome.storage.local

interface TrackingState {
  currentTabId: number | null;
  currentDomain: string | null;
  startTime: number | null; // Date.now()
}

// On tab activated or URL changed:
// 1. Calculate duration for previous tab
// 2. If duration >= 5 seconds, save entry to storage
// 3. Start tracking new tab

// On idle state change (chrome.idle API):
// - "idle" or "locked": pause tracking, save current entry
// - "active": resume tracking

// On service worker wake-up:
// - Read last state from storage
// - If there's an active tracking session, calculate elapsed time
// - Consider: was the browser closed? Use chrome.runtime.onStartup
```

### Data Aggregation

```typescript
// Daily aggregation runs on alarm (e.g., every hour, and at end of day)
// Reads raw TrackingEntry[] for today → produces DailyAggregate
// DailyAggregate is what gets sent to AI and displayed in dashboard
// Keep aggregates in a separate storage key: "aggregates:YYYY-MM-DD"
```

### Extension ↔ Dashboard Communication

The web dashboard can receive data from the extension via:

**Option A (Recommended): Extension posts aggregated stats to Supabase**
- On user-triggered sync or daily schedule
- Only DailyAggregate data (no URLs)
- Dashboard reads from Supabase

**Option B: Direct messaging (if same device)**
- Use `chrome.runtime.sendMessage` from dashboard page
- Only works when extension is installed on the same browser

Use Option A as the primary method — it enables cross-device dashboard access.

### AI Analysis Flow

```
1. User clicks "Analyze" or daily alarm triggers
2. Extension builds anonymized summary:
   {
     date: "2025-02-23",
     totalMinutes: 480,
     productiveMinutes: 300,
     distractionMinutes: 120,
     neutralMinutes: 60,
     topDomains: [
       { domain: "github.com", minutes: 180, category: "productive" },
       { domain: "youtube.com", minutes: 90, category: "distraction" },
       ...
     ],
     focusScore: 62
   }
3. POST to Supabase Edge Function /ai-analyze
4. Edge Function calls Gemini API with structured prompt
5. Return analysis text to extension
6. Store analysis in chrome.storage.local AND Supabase (ai_analyses table)
7. Display in popup and dashboard
```

### Default Domain Categories

Provide at least 100 pre-categorized domains in `packages/shared/src/constants/categories.ts`:

**Productive:** github.com, gitlab.com, stackoverflow.com, docs.google.com, notion.so, figma.com, linear.app, jira.atlassian.com, confluence.atlassian.com, trello.com, asana.com, slack.com, zoom.us, meet.google.com, teams.microsoft.com, code.visualstudio.com, replit.com, codepen.io, kaggle.com, arxiv.org, scholar.google.com, coursera.org, udemy.com, edx.org, khanacademy.org, medium.com (articles), dev.to, hackernews (news.ycombinator.com), leetcode.com, hackerrank.com, ...

**Distraction:** youtube.com (default, user can override for educational channels), facebook.com, instagram.com, twitter.com/x.com, reddit.com, tiktok.com, netflix.com, twitch.tv, 9gag.com, buzzfeed.com, disneyplus.com, hulu.com, pinterest.com, snapchat.com, ...

**Neutral:** google.com (search), gmail.com, outlook.com, calendar.google.com, maps.google.com, weather.com, wikipedia.org, amazon.com, ...

### Email Report Template

Use Resend's React email support. The email should be clean, mobile-friendly, and include:
- EchoFocus branding
- Today's focus score (big, prominent)
- Comparison to 7-day average
- Time breakdown bar chart (simple HTML/CSS)
- Top 5 domains
- AI insight summary (if available)
- CTA to open dashboard
- Unsubscribe link

---

## Testing Strategy

1. **Unit tests**: categorization logic, aggregation functions, storage helpers
2. **Integration tests**: Supabase Edge Functions, AI analysis flow
3. **Manual testing**: install extension in Chrome, use for a day, check all features
4. **Test framework**: Vitest (shared across all packages)

---

## Deployment

### Extension
1. `pnpm build:extension` produces `apps/extension/dist/`
2. Zip the `dist/` folder
3. Upload to Chrome Web Store Developer Dashboard

### Web Dashboard
1. Connect GitHub repo to Vercel
2. Set root directory to `apps/web`
3. Set environment variables in Vercel dashboard
4. Auto-deploys on push to main

### Supabase
1. Create project at supabase.com
2. Run migrations: `pnpm supabase:migrate`
3. Deploy Edge Functions: `supabase functions deploy`
4. Set secrets: `supabase secrets set GEMINI_API_KEY=xxx RESEND_API_KEY=xxx`

---

## Phase Implementation Order

**Start with Phase 1** — get a working extension that tracks browsing and shows stats in the popup. This is the core product. Then progressively add features.

See PRD.md Section 5 for detailed milestone breakdown.

When building each phase:
1. Start with shared types in `packages/shared`
2. Build the data layer first (storage, schemas)
3. Then build the logic (tracking, categorization, aggregation)
4. Then build the UI last
5. Test each feature before moving on
