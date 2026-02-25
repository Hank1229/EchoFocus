# Product Requirements Document (PRD)
# EchoFocus — Privacy-First Productivity Tracker

## 1. Product Vision

EchoFocus 是一款 **AI 驅動的智慧生產力追蹤工具**。它透過 Chrome Extension 自動記錄你的瀏覽行為，利用 Google Gemini AI 分析你的工作模式，並提供個人化的生產力建議與每日報告 — 幫助你理解自己的時間花在哪裡，並持續改善。

**核心價值主張：**
1. **智慧追蹤** — 全自動記錄，零手動操作，智慧分類 100+ 常用網站
2. **AI 教練** — Gemini AI 分析你的工作模式，給出具體可執行的改善建議
3. **數據洞察** — 視覺化 Dashboard 呈現趨勢、模式、專注時段
4. **你的數據，你作主** — 所有瀏覽記錄完全儲存在你的設備上，絕不上傳至任何第三方伺服器

**信任特色（差異化）：** 不同於 RescueTime、Toggl Track 等競品將用戶瀏覽數據回傳到自家伺服器，EchoFocus 採用「本地優先」架構 — 你的瀏覽記錄永遠留在你的設備上。這讓處理敏感資訊的專業人士（律師、醫師、金融從業人員）也能安心使用。

**目標用戶：**
- 知識工作者 / 遠端工作者：想了解自己的時間分配，提升日常生產力
- 學生：管理學習時間，減少分心，建立良好習慣
- 自由工作者 / 創業者：追蹤工作效率，優化時間管理
- 對隱私敏感的專業人士（律師、醫師、金融從業人員）：需要生產力工具但不願將瀏覽記錄上傳雲端

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

### Privacy Model — 核心原則

| 數據類型 | 儲存位置 | 上傳至後端？ |
|---------|---------|------------|
| 瀏覽 URL / 網域 | chrome.storage.local | ❌ 永不上傳 |
| 每次瀏覽時長 | chrome.storage.local | ❌ 永不上傳 |
| 分類結果 | chrome.storage.local | ❌ 永不上傳 |
| 聚合統計（如：每日專注 3.5 hr） | 可選上傳 | ⚠️ 僅匿名聚合數據 |
| AI 分析結果 | chrome.storage.local | ❌ 分析後丟棄 |
| 用戶設定 / 偏好 | Supabase | ✅ 跨裝置同步 |
| Email 地址 | Supabase | ✅ 用於認證和報告 |

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
- **AI:** Google Gemini API (gemini-2.0-flash — fast, cheap, sufficient)
- **Email:** Resend (generous free tier, great DX)

---

## 4. Feature Specifications

### 4.1 Core Tracking Engine (Extension Background Service Worker)

**Automatic Website Tracking:**
- Listen to `chrome.tabs.onActivated` and `chrome.tabs.onUpdated`
- Track active tab URL, domain, and time spent
- Minimum tracking threshold: 5 seconds (ignore quick tab switches)
- Handle edge cases: browser idle, tab closed, window focus lost
- Use `chrome.idle` API to detect user inactivity (default: 2 min idle threshold)

**Smart Categorization System:**
- Built-in default rules (productive/distraction/neutral) with 100+ pre-classified domains
- User-customizable rules (override defaults, add new domains)
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
- Storage budget: ~5MB estimated for heavy user (chrome.storage.local limit: 10MB)
- Export function: JSON / CSV download

### 4.2 Extension Popup (Quick View)

**Layout (320px width):**
- Status indicator (tracking on/off with toggle)
- Today's focus score (circular progress ring)
- Today's stats: productive hours, distraction hours, focus score
- Top 5 domains today (with category color coding)
- Quick actions: pause/resume, open dashboard, sync settings
- Current site category display with one-click re-categorize

### 4.3 Extension Options Page (Settings)

**Tabs:**
1. **General:** tracking on/off, idle timeout, data retention period
2. **Categories:** manage custom rules, import/export rules, bulk editor
3. **Privacy:** data audit log, export all data, delete all data, what-we-collect explanation
4. **Account:** login/logout, email preferences, sync settings
5. **About:** version, changelog, privacy policy link, support

### 4.4 Web Dashboard (Next.js)

**Pages:**
- `/` — Landing page (marketing, feature overview, install CTA)
- `/login` — Auth (Google OAuth / Email)
- `/dashboard` — Main dashboard (requires auth)
- `/dashboard/today` — Today's detailed breakdown
- `/dashboard/trends` — Weekly/monthly trends and charts
- `/dashboard/ai-insights` — AI analysis history
- `/dashboard/settings` — Account and preference settings
- `/privacy` — Privacy policy
- `/terms` — Terms of service

**Dashboard Features:**
- Daily/weekly/monthly time breakdown charts (bar, line, pie)
- Focus score trend over time
- Domain usage heatmap
- Productivity patterns (best hours, worst hours)
- Goal setting (daily productive hours target)
- AI insight cards (latest analysis)

**Important:** The dashboard reads data from the extension via a content script bridge or by the extension posting aggregated data to Supabase. Raw URLs never leave the extension.

### 4.5 AI Productivity Analysis

**Trigger:** User manually requests analysis, or daily at user-configured time.

**Process:**
1. Extension aggregates today's data into anonymized summary (no URLs, only domains + durations + categories)
2. Summary sent to Supabase Edge Function
3. Edge Function calls Gemini API with structured prompt
4. AI response returned to extension and stored locally
5. Original summary data discarded from server memory

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

**Privacy Safeguard:** The AI never sees full URLs, page titles, or any content the user viewed — only domain names and time durations.

### 4.6 Daily Email Report

**Trigger:** Scheduled via Supabase cron or Edge Function (user-configured time, default 8 PM).

**Content:**
- Today's focus score with comparison to 7-day average
- Time breakdown (productive / distraction / neutral)
- Top 5 domains
- AI insight summary (if enabled)
- Link to full dashboard
- Unsubscribe link

**Email Provider:** Resend (free tier: 3,000 emails/month, more than enough for beta)

### 4.7 User Custom Classification Rules

**Rule Types:**
- Domain exact match: `github.com` → productive
- Domain wildcard: `*.google.com` → productive
- Path match: `youtube.com/watch` → distraction, `youtube.com/@channel-name` → productive
- Keyword in title: title contains "tutorial" → productive (optional, advanced)

**UI:** Drag-and-drop rule manager in Options Page, with search and bulk operations.

**Sync:** Rules stored in chrome.storage.sync (auto-syncs across Chrome instances with same Google account) AND optionally backed up to Supabase for cross-browser recovery.

---

## 5. Development Milestones

### Phase 1: Foundation (Week 1-2) — "It tracks"
- [ ] Project scaffolding (monorepo: extension + web + shared types)
- [ ] Chrome Extension with Manifest V3 + TypeScript + Vite + CRXJS
- [ ] Background service worker: tab tracking + duration calculation
- [ ] Default categorization engine (100+ domains)
- [ ] chrome.storage.local data layer with TypeScript interfaces
- [ ] Basic popup UI (today's stats, tracking toggle)
- [ ] Data retention auto-cleanup

**Deliverable:** Installable extension that tracks browsing and shows basic stats.

### Phase 2: Dashboard + Auth (Week 3-4) — "It's useful"
- [ ] Supabase project setup (auth, database, edge functions)
- [ ] Next.js web dashboard scaffolding
- [ ] User authentication (Google OAuth + Email)
- [ ] Dashboard: today view, weekly trends, charts
- [ ] Extension Options page (settings, category management)
- [ ] Custom classification rules UI
- [ ] Extension ↔ Dashboard data bridge (aggregated stats only)

**Deliverable:** Full working product with extension + dashboard.

### Phase 3: AI + Email (Week 5-6) — "It's smart"
- [ ] Supabase Edge Function for Gemini API proxy
- [ ] AI analysis integration (on-demand + scheduled)
- [ ] Daily email report system via Resend
- [ ] AI insight cards in popup and dashboard
- [ ] Email preference settings

**Deliverable:** AI-powered insights and daily email reports working.

### Phase 4: Polish + Store (Week 7-8) — "It's ready"
- [ ] Extension icons (16, 48, 128px)
- [ ] Chrome Web Store listing assets (screenshots, promo images, description)
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Onboarding flow (first install experience)
- [ ] Error handling, edge cases, offline support
- [ ] Performance optimization (storage queries, background CPU)
- [ ] Data export (JSON/CSV)
- [ ] Chrome Web Store submission

**Deliverable:** Published on Chrome Web Store.

---

## 6. Chrome Web Store Requirements Checklist

- [ ] Manifest V3 compliant
- [ ] Minimum permissions (only `tabs`, `storage`, `alarms`, `idle`)
- [ ] No `host_permissions` for `<all_urls>` (we don't need it — we only read tab info)
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

Only user preferences and account data — NO browsing data.

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
- **Offline:** Extension works fully offline; sync when online
- **Security:** All API calls via HTTPS, Supabase RLS on all tables
- **Accessibility:** Dashboard meets WCAG 2.1 AA
- **Browser Support:** Chrome 116+ (Manifest V3 stable)
