# Product Requirements Document (PRD)
# EchoFocus: Privacy-First Productivity Tracker

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
│  │(Google/  │  │Functions │  │(user preferences │  │
│  │ Email)   │  │(AI proxy)│  │ & settings ONLY) │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          External Services                           │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ Google       │  │ Resend / SendGrid          │   │
│  │ Gemini API   │  │ (Email delivery)           │   │
│  └──────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Privacy Model: Core Principles

| Data type | Where it is stored | Uploaded to the backend? |
|---------|---------|------------|
| Browsing URLs / domains | chrome.storage.local | No, never uploaded |
| Duration of each visit | chrome.storage.local | No, never uploaded |
| Category results | chrome.storage.local | No, never uploaded |
| Aggregate stats (e.g., 3.5 hr of focus per day) | Optional upload | Partly: anonymous aggregate data only |
| AI analysis results | chrome.storage.local | No, discarded after analysis |
| User settings / preferences | Supabase | Yes, synced across devices |
| Email address | Supabase | Yes, used for authentication and reports |

---

## 3. Tech Stack

### Chrome Extension (Manifest V3)
- **Language:** TypeScript
- **Build:** Vite + CRXJS (Chrome Extension Vite plugin)
- **UI Framework:** React (popup & options page) + Tailwind CSS
- **Storage:** chrome.storage.local (browsing data), chrome.storage.sync (settings)
- **Background:** Service Worker (Manifest V3 required)

### Web Dashboard
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Hosting:** Vercel (free tier)

### Backend (Supabase)
- **Database:** PostgreSQL (Supabase hosted)
- **Auth:** Supabase Auth (Google OAuth + Email/Password)
- **API:** Supabase Edge Functions (Deno runtime)
- **Realtime:** Supabase Realtime (optional, for cross-device sync)

### External APIs
- **AI:** Google Gemini API (gemini-3.5-flash-lite: fast, cheap, and good enough)
- **Email:** Resend (generous free tier, good developer experience)

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
- Users can create custom category names (e.g., "research", "communication", "entertainment")

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
  topDomains: { domain: string; seconds: number; category: Category }[];
  focusScore: number;   // 0-100
}
```

**Data Retention:**
- Raw entries: 30 days rolling (auto-cleanup)
- Daily aggregates: 365 days
- Storage budget: an estimated ~5MB for a heavy user (chrome.storage.local limit: 10MB)
- Export: JSON / CSV download

### 4.2 Extension Popup (Quick View)

**Layout (320px width):**
- Status indicator (tracking on/off, with a toggle)
- Today's focus score (circular progress ring)
- Today's stats: productive hours, distraction hours, focus score
- Top 5 domains today (with category color coding)
- Quick actions: pause/resume, open dashboard, sync settings
- The current site's category, with one-click re-categorize

### 4.3 Extension Options Page (Settings)

**Tabs:**
1. **General:** tracking on/off, idle timeout, data retention period
2. **Categories:** manage custom rules, import/export rules, bulk editor
3. **Privacy:** data audit log, export all data, delete all data, what-we-collect explanation
4. **Account:** login/logout, email preferences, sync settings
5. **About:** version, changelog, privacy policy link, support

### 4.4 Web Dashboard (Next.js)

**Pages:**
- `/`: Landing page (marketing, feature overview, install CTA)
- `/login`: Auth (Google OAuth / Email)
- `/dashboard`: Main dashboard (requires auth)
- `/dashboard/today`: Today's detailed breakdown
- `/dashboard/trends`: Weekly/monthly trends and charts
- `/dashboard/ai-insights`: AI analysis history
- `/dashboard/settings`: Account and preference settings
- `/privacy`: Privacy policy
- `/terms`: Terms of service

**Dashboard Features:**
- Daily/weekly/monthly time breakdown charts (bar, line, pie)
- Focus score trend over time
- Domain usage heatmap
- Productivity patterns (best hours, worst hours)
- Goal setting (daily productive hours target)
- AI insight cards (latest analysis)

**Important:** The dashboard gets its data from the extension in one of two ways: through a content script bridge, or from aggregated data the extension posts to Supabase. Raw URLs never leave the extension.

### 4.5 AI Productivity Analysis

**Trigger:** The user requests an analysis by hand, or it runs once a day at a time the user sets.

**Process:**
1. The extension aggregates today's data into an anonymized summary (no URLs, only domains + durations + categories)
2. The extension sends the summary to a Supabase Edge Function
3. The Edge Function calls the Gemini API with a structured prompt
4. The Edge Function returns the AI response to the extension, which stores it locally
5. The server discards the original summary data from memory

**AI Prompt Template:**
```
You are a professional productivity coach. Analyze this user's daily activity summary and provide actionable insights.

Data: {aggregated_stats_only}

Provide:
1. Overall assessment (encouraging tone)
2. Identified patterns
3. 3 specific, actionable suggestions
4. Motivational closing

Language: {user_preferred_language}
Length: 150-250 words
```

**Privacy Safeguard:** The AI sees domain names and time durations and nothing else. It never sees full URLs, page titles, or any content the user viewed.

### 4.6 Daily Email Report

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
- Keyword in title: title contains "tutorial" → productive (optional, advanced)

**UI:** A drag-and-drop rule manager in the Options Page, with search and bulk operations.

**Sync:** Rules live in chrome.storage.sync, which Chrome syncs across instances signed in to the same Google account. An optional backup to Supabase covers cross-browser recovery.

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
- [ ] Supabase Edge Function for Gemini API proxy
- [ ] AI analysis integration (on-demand + scheduled)
- [ ] Daily email report system via Resend
- [ ] AI insight cards in popup and dashboard
- [ ] Email preference settings

**Deliverable:** AI analysis and daily email reports both work.

### Phase 4: Polish + Store (Week 7-8), "It's ready"
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
- [ ] Minimum permissions (only `tabs`, `storage`, `alarms`, `idle`)
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

The database holds user preferences and account data only. It holds NO browsing data.

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
  email_report_enabled BOOLEAN DEFAULT true,
  email_report_time TIME DEFAULT '20:00',
  ai_analysis_enabled BOOLEAN DEFAULT true,
  idle_timeout_minutes INT DEFAULT 2,
  data_retention_days INT DEFAULT 30,
  daily_goal_minutes INT DEFAULT 360, -- 6 hours default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom categorization rules (synced from extension)
CREATE TABLE custom_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,        -- domain or pattern
  match_type TEXT NOT NULL,     -- 'exact', 'wildcard', 'path'
  category TEXT NOT NULL,       -- 'productive', 'distraction', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analysis history (optional, for dashboard display)
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  aggregated_input JSONB,       -- anonymized stats sent to AI
  analysis_text TEXT,           -- AI response
  focus_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own data" ON profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can only access own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own rules" ON custom_rules
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access own analyses" ON ai_analyses
  FOR ALL USING (auth.uid() = user_id);
```

---

## 8. Non-Functional Requirements

- **Performance:** Background service worker CPU < 1%, memory < 50MB
- **Storage:** < 10MB chrome.storage.local usage (with auto-cleanup)
- **Latency:** Popup opens in < 200ms, dashboard loads in < 2s
- **Offline:** Every extension feature works offline; sync runs once the connection returns
- **Security:** All API calls via HTTPS, Supabase RLS on all tables
- **Accessibility:** Dashboard meets WCAG 2.1 AA
- **Browser Support:** Chrome 116+ (Manifest V3 stable)
