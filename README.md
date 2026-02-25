# EchoFocus — AI-Powered Privacy-First Productivity Tracker

> Track your time. Own your data. Improve with AI.

EchoFocus is a Chrome Extension that automatically records your browsing behavior, uses Google Gemini AI to analyze your work patterns, and delivers personalized productivity insights — all while keeping your raw browsing data **100% on your device**.

---

## Why EchoFocus?

Unlike RescueTime or Toggl Track, EchoFocus uses a **local-first architecture**. Your browsing history never leaves your machine. This makes it safe for professionals handling sensitive information — lawyers, doctors, engineers, and anyone who values privacy.

| Feature | EchoFocus | RescueTime | Toggl Track |
|---|---|---|---|
| Raw URLs stored on server | ❌ Never | ✅ Yes | ✅ Yes |
| AI productivity coaching | ✅ Gemini AI | ✅ | ❌ |
| Offline tracking | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ |
| Free tier | ✅ | Limited | Limited |

---

## Features

- **Auto tracking** — silently records time spent on every domain, zero manual input
- **Smart categorization** — 100+ pre-classified domains (productive / distraction / neutral), fully customizable
- **AI analysis** — Gemini AI reads anonymized stats and gives specific, actionable suggestions
- **Daily email reports** — focus score, top domains, AI insight, sent via Resend
- **Web dashboard** — charts, trends (7/30 day), AI history, settings
- **Data export** — download everything as JSON or CSV at any time
- **Onboarding flow** — guided first-install experience

---

## Architecture

```
┌──────────────────────────────────────────────┐
│              Chrome Extension (MV3)           │
│  ┌───────────┐  ┌─────────┐  ┌────────────┐  │
│  │ Background│  │  Popup  │  │  Options   │  │
│  │  Worker   │  │ (stats) │  │ (settings) │  │
│  └─────┬─────┘  └────┬────┘  └────────────┘  │
│        │              │                       │
│  ┌─────▼──────────────▼─────────────────────┐ │
│  │         chrome.storage.local              │ │
│  │   ALL browsing data stays here — always  │ │
│  └──────────────────┬───────────────────────┘ │
└─────────────────────┼────────────────────────┘
                      │ anonymized aggregates only
                      ▼
┌──────────────────────────────────────────────┐
│                  Supabase                     │
│  Auth · PostgreSQL (RLS) · Edge Functions    │
└──────┬──────────────────────────┬────────────┘
       │                          │
       ▼                          ▼
  Google Gemini API           Resend Email
  (AI analysis proxy)         (daily reports)
```

### Privacy model

| Data type | Stored where | Uploaded? |
|---|---|---|
| Raw URLs / page titles | `chrome.storage.local` | ❌ Never |
| Time per domain | `chrome.storage.local` | ❌ Never |
| Daily aggregates (domain + duration only) | Local + optional Supabase sync | ⚠️ Opt-in, anonymized |
| AI analysis text | Local + Supabase | ✅ (no URLs, no titles) |
| Account / preferences | Supabase | ✅ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Extension | Vite + CRXJS + React + TypeScript (Manifest V3) |
| Extension UI | React + Tailwind CSS |
| Web Dashboard | Next.js 14 (App Router) + Tailwind + shadcn/ui + Recharts |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| AI | Google Gemini API (`gemini-2.0-flash`) |
| Email | Resend |

---

## Repo Structure

```
echofocus/
├── apps/
│   ├── extension/          # Chrome Extension (Vite + CRXJS + React)
│   │   └── src/
│   │       ├── background/ # Service worker: tracking, storage, alarms
│   │       ├── popup/      # Extension popup UI
│   │       ├── options/    # Settings page (5 tabs)
│   │       └── onboarding/ # First-install welcome flow
│   └── web/                # Next.js 14 dashboard
│       └── src/app/
│           ├── dashboard/  # today, trends, ai-insights, settings
│           ├── privacy/    # Privacy policy
│           └── terms/      # Terms of service
├── packages/
│   └── shared/             # Shared TypeScript types & utilities
├── supabase/
│   ├── functions/
│   │   ├── ai-analyze/     # Gemini API proxy Edge Function
│   │   └── send-email-report/ # Resend daily report Edge Function
│   └── migrations/         # PostgreSQL schema
├── docs/                   # PRD and project documentation
└── backend/                # Early Python prototype (archived)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project
- A [Google Gemini API](https://aistudio.google.com) key
- A [Resend](https://resend.com) account (for email reports)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

**Extension** (`apps/extension/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DASHBOARD_URL=http://localhost:3000
```

**Web dashboard** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Supabase Edge Functions** (set via `supabase secrets set`):
```
GEMINI_API_KEY=your-gemini-api-key
RESEND_API_KEY=your-resend-api-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set up the database

Run the migration in the Supabase SQL Editor:
```bash
# Copy contents of supabase/migrations/001_initial_schema.sql
# Paste and run in: https://supabase.com/dashboard → SQL Editor
```

Enable Google OAuth in Supabase Auth settings and add `https://*.chromiumapp.org/` to redirect URLs.

### 4. Run the development servers

```bash
# Extension (watch mode — auto-rebuilds on file changes)
pnpm dev:extension

# Web dashboard
pnpm dev:web
```

### 5. Load the extension in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select `apps/extension/dist/`

---

## Available Scripts

```bash
pnpm dev:extension      # Extension watch mode
pnpm dev:web            # Next.js dev server (localhost:3000)
pnpm build:extension    # Production build → apps/extension/dist/
pnpm build:web          # Next.js production build
pnpm typecheck          # TypeScript check across all packages
```

---

## Deploying

### Chrome Extension
1. `pnpm build:extension`
2. Zip the `apps/extension/dist/` folder
3. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Web Dashboard
1. Connect this repo to [Vercel](https://vercel.com)
2. Set root directory to `apps/web`
3. Add environment variables in Vercel dashboard
4. Deploys automatically on push to `main`

### Supabase Edge Functions
```bash
supabase functions deploy ai-analyze
supabase functions deploy send-email-report
supabase secrets set GEMINI_API_KEY=xxx RESEND_API_KEY=xxx
```

---

## Extension Permissions

EchoFocus requests **minimal permissions** — only what is strictly necessary:

| Permission | Why |
|---|---|
| `tabs` | Read the active tab's URL/title for tracking |
| `storage` | Save browsing data locally on your device |
| `alarms` | Schedule hourly aggregation and daily sync |
| `idle` | Pause tracking when you step away |
| `identity` | Google OAuth sign-in |

No `<all_urls>` host permission. No access to page content.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Open a pull request

---

## License

MIT

---

## Links

- [Privacy Policy](https://echofocus.app/privacy)
- [Terms of Service](https://echofocus.app/terms)
- [Report an Issue](https://github.com/Hank1229/EchoFocus/issues)
