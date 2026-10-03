# Product Requirements Document (PRD)
# EchoFocus: Focus Tracker and Pomodoro Timer

## 1. Product Vision

EchoFocus is a productivity tracker that uses AI. Its Chrome Extension records your browsing on its own, Google Gemini AI analyzes your work patterns, and EchoFocus gives you personal productivity suggestions and a daily report. You see where your time goes and can keep improving how you spend it.

**Core value proposition:**
1. **Automatic tracking:** the extension records everything with zero manual input and sorts 100+ common sites into categories for you.
2. **AI coach:** Gemini AI analyzes your work patterns and gives you concrete suggestions you can act on.
3. **Data view:** a visual Dashboard charts your trends, patterns, and focus periods.
4. **Your data, your call:** your whole browsing history stays on your device, and EchoFocus never uploads it to any third-party server.

**Trust (what sets EchoFocus apart):** Competitors such as RescueTime and Toggl Track send their users' browsing data back to their own servers. EchoFocus uses a local-first architecture, so your browsing history stays on your device. That lets professionals who handle sensitive information (lawyers, doctors, finance professionals) use it with peace of mind.

**Target users:**
- Knowledge workers and remote workers: want to see how they divide their time and get more done each day
- Students: manage study time, cut distractions, build good habits
- Freelancers and founders: track their work efficiency and improve how they manage time
- Privacy-conscious professionals (lawyers, doctors, finance professionals): need a productivity tool but won't upload their browsing history to the cloud

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Extension                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │Background │  │  Popup   │  │  Options Page     │  │
│  │Service   │  │(Quick    │  │(Settings/Custom   │  │
│  │Worker    │  │ Stats)   │  │ Rules)            │  │
│  └────┬─────┘  └────┬─────┘  └───────────────────┘  │
│       │              │                                │
│  ┌────▼──────────────▼────────────────────────────┐  │
│  │         chrome.storage.local                    │  │
│  │  (ALL browsing data stays HERE — never leaves)  │  │
│  └────────────────────┬───────────────────────────┘  │
└───────────────────────┼─────────────────────────────┘
                        │ (only aggregated stats,
                        │  never raw URLs)
                        ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Backend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Auth   │  │ Edge     │  │  PostgreSQL      │  │
│  │(Google   │  │Functions │  │(prefs, rules,    │  │
│  │ OAuth)   │  │(AI proxy)│  │ daily aggregates,│  │
│  │          │  │          │  │ AI results)      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          External Services                           │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ Google       │  │ Resend (shelved)           │   │
│  │ Gemini API   │  │ (no email is sent)         │   │
│  └──────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Privacy Model: Core Principles

| Data type | Where it is stored | Uploaded to the backend? |
|---------|---------|------------|
| Browsing URLs / page titles | chrome.storage.local | No, never uploaded |
| Duration of each visit | chrome.storage.local | No, never uploaded |
| Category results | chrome.storage.local | No, never uploaded |
| Daily aggregate stats (time per category, focus score, productive time per hour, top 10 domains with their time and category) | chrome.storage.local; Supabase `synced_aggregates` when signed in | Yes, when signed in: domain names and totals only, never URLs |
| AI analysis results | Supabase `ai_analyses` (with the summary sent to the AI); the extension also keeps its 21:00 result in chrome.storage.local | Yes, stored after analysis |
| User settings / preferences | chrome.storage.local; Supabase `user_preferences` when signed in | Yes, when signed in: synced across devices |
| Email address | Supabase | Yes, used for authentication |

---

## 3. Tech Stack

### Chrome Extension (Manifest V3)
- **Language:** TypeScript
- **Build:** Vite + CRXJS (Chrome Extension Vite plugin)
- **UI Framework:** React (popup & options page) + Tailwind CSS
- **Storage:** chrome.storage.local (browsing data, settings, and custom rules; chrome.storage.sync is not used)
- **Background:** Service Worker (Manifest V3 required)

### Web Dashboard
- **Framework:** Next.js 15 (App Router) with React 19
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Hosting:** Vercel (free tier)

### Backend (Supabase)
- **Database:** PostgreSQL (Supabase hosted)
- **Auth:** Supabase Auth (Google OAuth only). The extension signs in through chrome.identity.launchWebAuthFlow and the dashboard through the web OAuth redirect; each keeps its own Supabase session.
- **API:** Supabase Edge Functions (Deno runtime)
- **Realtime:** not used. The extension reads the cloud tables at the nightly sync, at browser start, and while the popup is open.

### External APIs
- **AI:** Google Gemini API (gemini-3.5-flash-lite: fast, cheap, and good enough)
- **Email:** Resend, shelved. The send-email-report function is a 503 stub, so nothing sends email.

---

## 4. Feature Specifications

### 4.1 Core Tracking Engine (Extension Background Service Worker)

**Automatic Website Tracking:**
- Listen for `chrome.tabs.onActivated` and `chrome.tabs.onUpdated`
- Record the active tab's URL, domain, and time spent
- Minimum tracking threshold: 5 seconds (quick tab switches are ignored)
- Edge cases to handle: browser idle, tab closed, window loses focus
- Use the `chrome.idle` API to detect when the user goes inactive (default: 2 min idle threshold)

**Categorization System:**
- Built-in default rules (productive/distraction/neutral) with 100+ pre-classified domains
- Rules the user can customize (override defaults, add new domains)
- Category hierarchy: domain-level → subdomain-level → path-level
- Categories: `productive`, `distraction`, `neutral`, `uncategorized`
- The four categories are fixed: a custom rule picks one of them, and users cannot add new category names

**Data Storage Schema (chrome.storage.local):**
```typescript
interface TrackingEntry {
  id: string;           // uuid
  domain: string;       // e.g., "github.com"
  url: string;          // full URL (never leaves device)
  title: string;        // page title
  category: Category;
  startTime: number;    // Unix timestamp ms
  duration: number;     // seconds
  date: string;         // YYYY-MM-DD (for quick filtering)
}

interface DailyAggregate {
  date: string;
  totalSeconds: number;
  productiveSeconds: number;
  distractionSeconds: number;
  neutralSeconds: number;
  uncategorizedSeconds: number;
  topDomains: { domain: string; seconds: number; category: Category }[];
  focusScore: number;   // 0-100
  productiveByHour?: number[]; // 24 entries, productive seconds per local hour
}
```

**Data Retention:**
- Raw entries: 30 days rolling by default (auto-cleanup; Options sets 7 to 365 days)
- Daily aggregates: 365 days
- Storage budget: an estimated ~5MB for a heavy user (chrome.storage.local limit: 10MB)
- Export: JSON / CSV download

### 4.2 Extension Popup (Quick View)

**Layout (360px width):**
- Status indicator (tracking on/off, with a toggle)
- Today's focus score (circular progress ring), in one card with a pomodoro focus timer; while a round runs, the timer's countdown ring takes the ring's place and the score shows as text
- Today's stats: productive hours, distraction hours, focus score
- Top 5 domains today (with category color coding)
- Quick actions: pause/resume tracking, a link that opens the dashboard's Today page, and a gear that opens Dashboard Settings
- The current site and its category dot; clicking a site in the top 5 opens Options on the Categories tab with a rule for that domain prefilled

### 4.3 Extension Options Page (Settings)

**Tabs:**
1. **General:** tracking on/off, idle timeout, data retention period
2. **Categories:** manage custom rules, import/export rules
3. **Privacy:** storage usage, export all data (JSON or CSV), privacy policy and terms links, delete all tracking data
4. **Account:** Google sign-in and sign-out, last sync time, a button that syncs today's data, a link to the web dashboard
5. **About:** version, how EchoFocus protects your privacy, links to the privacy policy, terms, and issue tracker

### 4.4 Web Dashboard (Next.js)

**Pages:**
- `/`: Landing page (marketing, feature overview, install CTA)
- `/login`: Auth (Google OAuth only)
- `/dashboard`: redirects to `/dashboard/today` (requires auth)
- `/dashboard/today`: Today's detailed breakdown
- `/dashboard/trends`: Trends over the last 7 or 30 days, with charts
- `/dashboard/ai-insights`: redirects to `/dashboard/today`; the daily insight lives on Today and the weekly review on Trends
- `/dashboard/settings`: Account and preference settings
- `/privacy`: Privacy policy
- `/terms`: Terms of service

**Dashboard Features:**
- Time breakdown charts over the last 7 or 30 days (a stacked bar chart per day, and a focus score area chart)
- Focus score trend over time
- Per-day site ranking (time per domain); there is no domain heatmap
- Productivity patterns (best focus hours, as a heat strip of productive time by hour)
- Goal setting (daily productive hours target)
- AI insights: a daily insight on Today and a weekly review on Trends

**Important:** The dashboard gets its data only from the aggregated data the extension posts to Supabase; there is no content script bridge. Raw URLs never leave the extension.

### 4.5 AI Productivity Analysis

**Trigger:** Analysis needs a signed-in account. The extension runs it once a day at 21:00 local time (fixed, not user-set) when the day has at least 30 minutes tracked. The user can also generate a daily insight by hand on the dashboard's Today page, and a weekly review on Trends.

**Process:**
1. The extension aggregates today's data into an anonymized summary (no URLs, only domains + durations + categories)
2. The extension sends the summary to a Supabase Edge Function (the dashboard sends the same summary, built from the synced aggregate)
3. The Edge Function calls the Gemini API with a structured prompt
4. The Edge Function stores the result in the `ai_analyses` table and returns it; the extension also keeps a copy in chrome.storage.local
5. The server keeps the summary it received, in `ai_analyses.aggregated_input` next to the result

**AI Prompt Template:**
```
You are a focus analyst writing the user's short daily review. Voice: steady and plain. State the data and what it shows; do not cheer, scold, or dramatize.

<data>{aggregated_stats_only}</data>

Write three short paragraphs, in this order:
1. What the day looked like, stated plainly with the key numbers.
2. One or two patterns worth noticing, each tied to a specific data point.
3. Close with exactly one concrete suggestion for tomorrow.

Language: {user_preferred_language}
Length: 150-250 words
Format: Plain text, no Markdown formatting, no emoji
```

**Privacy Safeguard:** The AI sees the date, the time per category, the focus score, and up to 8 domain names with their minutes and category, and nothing else. It never sees full URLs, page titles, or any content the user viewed.

### 4.6 Daily Email Report

**Status:** shelved. The send-email-report function is a 503 stub (the real code is parked in `index.parked.ts`), the dashboard hides the email settings, and migration 007 defaults `email_report_enabled` to false. Nothing sends email.

**Trigger:** A Supabase cron job or Edge Function sends it at the time the user picks (default 8 PM).

**Content:**
- Today's focus score with comparison to 7-day average
- Time breakdown (productive / distraction / neutral)
- Top 5 domains
- AI insight summary (if enabled)
- Link to full dashboard
- Unsubscribe link

**Email Provider:** Resend (free tier: 3,000 emails/month, more than the beta needs)

### 4.7 User Custom Classification Rules

**Rule Types:**
- Domain exact match: `github.com` → productive
- Domain wildcard: `*.google.com` → productive
- Path match: `youtube.com/watch` → distraction, `youtube.com/@channel-name` → productive
- Keyword in title: title contains "tutorial" → productive (optional, advanced; not built, rules match domains and paths only)

**UI:** A rule list in the Options Page's Categories tab: add a rule (pattern, match type, category), delete a rule, and import or export rules as JSON. Signed in, Dashboard Settings → Categories edits the same rules.

**Sync:** Rules live in chrome.storage.local. Signed in, they sync with the Supabase `custom_rules` table, and the cloud copy is authoritative.

---

## 5. Development Milestones

### Phase 1: Foundation (Week 1-2), "It tracks"
- [ ] Project scaffolding (monorepo: extension + web + shared types)
- [ ] Chrome Extension with Manifest V3 + TypeScript + Vite + CRXJS
- [ ] Background service worker: tab tracking + duration calculation
- [ ] Default categorization engine (100+ domains)
- [ ] chrome.storage.local data layer with TypeScript interfaces
- [ ] Basic popup UI (today's stats, tracking toggle)
- [ ] Data retention auto-cleanup

**Deliverable:** An installable extension that tracks browsing and shows basic stats.

### Phase 2: Dashboard + Auth (Week 3-4), "It's useful"
- [ ] Supabase project setup (auth, database, edge functions)
- [ ] Next.js web dashboard scaffolding
- [ ] User authentication (Google OAuth + Email)
- [ ] Dashboard: today view, weekly trends, charts
- [ ] Extension Options page (settings, category management)
- [ ] Custom classification rules UI
- [ ] Extension ↔ Dashboard data bridge (aggregated stats only)

**Deliverable:** A complete, working product: extension + dashboard.

### Phase 3: AI + Email (Week 5-6), "It's smart"
**Status:** AI analysis shipped; its insights show on the dashboard only, not in the popup. The email report and its preference settings are shelved (see 4.6).
- [ ] Supabase Edge Function for Gemini API proxy
- [ ] AI analysis integration (on-demand + scheduled)
- [ ] Daily email report system via Resend
- [ ] AI insight cards in popup and dashboard
- [ ] Email preference settings

**Deliverable:** AI analysis and daily email reports both work.

### Phase 4: Polish + Store (Week 7-8), "It's ready"
**Status:** not submitted to the Chrome Web Store. The landing page's install links point to GitHub Releases.
- [ ] Extension icons (16, 48, 128px)
- [ ] Chrome Web Store listing assets (screenshots, promo images, description)
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Onboarding flow (first install experience)
- [ ] Error handling, edge cases, offline support
- [ ] Performance optimization (storage queries, background CPU)
- [ ] Data export (JSON/CSV)
- [ ] Chrome Web Store submission

**Deliverable:** Published on the Chrome Web Store.

---

## 6. Chrome Web Store Requirements Checklist

- [ ] Manifest V3 compliant
- [ ] Minimum permissions: `tabs`, `storage`, `alarms`, `idle`, plus `identity` (Google sign-in), `notifications` (daily summary and timer alerts), and `favicon` (site icons in the popup)
- [ ] No `host_permissions` for `<all_urls>` (we don't need it, since we only read tab info)
- [ ] Privacy policy URL (hosted on web dashboard domain)
- [ ] Extension icons: 16x16, 48x48, 128x128 PNG
- [ ] Store listing: title, description (132 char summary + detailed), category
- [ ] Screenshots: at least 1 (1280x800 or 640x400)
- [ ] Promotional images: small tile (440x280)
- [ ] Single purpose description (required by Google)
- [ ] Developer account ($5 one-time fee)
- [ ] No obfuscated code
- [ ] Content Security Policy defined in manifest

---

## 7. Database Schema (Supabase PostgreSQL)

The database holds account data, preferences, custom rules, daily aggregates (time totals and top domain names), AI analyses, and the AI rate-limit counters. It holds no URLs, page titles, or per-visit records. The schema below is a simplified view of `supabase/migrations/`; it leaves out the two rate-limit tables (`ai_generation_quota`, `ai_weekly_quota`), which no client role can read or write.

```sql
-- Users (managed by Supabase Auth, extended with profile)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  email TEXT NOT NULL,
  preferred_language TEXT DEFAULT 'zh-TW',
  timezone TEXT DEFAULT 'Asia/Taipei',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_report_enabled BOOLEAN DEFAULT false, -- email report shelved (migration 007)
  email_report_time TIME DEFAULT '20:00',
  ai_analysis_enabled BOOLEAN DEFAULT true,
  idle_timeout_minutes INT DEFAULT 2,
  data_retention_days INT DEFAULT 30,
  daily_goal_minutes INT DEFAULT 360, -- 6 hours default
  theme TEXT DEFAULT 'system',  -- 'light', 'dark', 'system'
  pomodoro_focus_minutes INT DEFAULT 25,
  pomodoro_break_minutes INT DEFAULT 5,
  pomodoro_reminders_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Custom categorization rules (synced with the extension; also edited in Dashboard Settings)
CREATE TABLE custom_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,        -- domain or pattern
  match_type TEXT NOT NULL,     -- 'exact', 'wildcard', 'path'
  category TEXT NOT NULL,       -- 'productive', 'distraction', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregates uploaded by the extension (domain names and durations, no URLs or titles)
CREATE TABLE synced_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_seconds INT DEFAULT 0,
  productive_seconds INT DEFAULT 0,
  distraction_seconds INT DEFAULT 0,
  neutral_seconds INT DEFAULT 0,
  uncategorized_seconds INT DEFAULT 0,
  focus_score INT DEFAULT 0,
  top_domains JSONB DEFAULT '[]', -- [{ domain, seconds, category }], top 10
  productive_by_hour INTEGER[],   -- 24 productive-second counts, one per local hour
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- AI analyses for dashboard display (written only by the ai-analyze function)
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT DEFAULT 'daily',    -- 'daily' or 'weekly'
  aggregated_input JSONB,       -- anonymized stats sent to AI
  analysis_text TEXT,           -- AI response
  focus_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date, type)
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can only access own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own rules" ON custom_rules
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own aggregates" ON synced_aggregates
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own analyses" ON ai_analyses
  FOR ALL USING (auth.uid() = user_id);
-- Clients cannot INSERT or UPDATE ai_analyses (grants revoked); they can read and delete
REVOKE INSERT, UPDATE ON ai_analyses FROM authenticated, anon;
```

---

## 8. Non-Functional Requirements

- **Performance:** Background service worker CPU < 1%, memory < 50MB
- **Storage:** < 10MB chrome.storage.local usage (with auto-cleanup)
- **Latency:** Popup opens in < 200ms, dashboard loads in < 2s
- **Offline:** Tracking, the popup, the focus timer, and Options work offline; sign-in and AI analysis need a connection. A day that fails to sync stays queued and retries at the next nightly sync or browser start
- **Security:** All API calls via HTTPS, Supabase RLS on all tables
- **Accessibility:** Dashboard meets WCAG 2.1 AA
- **Browser Support:** Chrome 116+ (Manifest V3 stable)
