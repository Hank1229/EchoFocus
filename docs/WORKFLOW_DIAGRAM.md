# Productivity Tracker - Complete Workflow Diagram

## Complete System Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTIVITY TRACKER - FULL SYSTEM WORKFLOW              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Chrome Extension (Frontend - Browser)

```
  ┌──────────────────────────────────────────────────────────────┐
  │                    USER BROWSES THE WEB                       │
  │               (Visits github.com, youtube.com, etc.)          │
  └──────────────┬───────────────────────────┬───────────────────┘
                 │                           │
        Tab Switched                  URL Changed
   (tabs.onActivated)            (tabs.onUpdated)
                 │                           │
                 ▼                           ▼
  ┌──────────────────────────────────────────────────────────────┐
  │              background.js (Service Worker)                   │
  │                                                               │
  │  1. Detect tab switch / URL change                            │
  │  2. Calculate duration on previous tab (Date.now() - start)   │
  │  3. Skip if duration < 5 seconds                              │
  │  4. Categorize URL via categorizeUrl()                        │
  │     ┌─────────────────────────────────────────┐              │
  │     │  PRODUCTIVE: github, stackoverflow,      │              │
  │     │    docs.google, notion, figma, linkedin,  │              │
  │     │    gmail                                  │              │
  │     │  DISTRACTION: youtube, facebook,          │              │
  │     │    instagram, twitter, reddit, tiktok,    │              │
  │     │    netflix                                │              │
  │     │  NEUTRAL: everything else                 │              │
  │     └─────────────────────────────────────────┘              │
  │  5. Create Activity object:                                   │
  │     { url, domain, duration, timestamp, category }            │
  │  6. Save to chrome.storage.local                              │
  └──────────────────────────┬───────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
  ┌─────────────────────┐     ┌──────────────────────────────┐
  │  Auto Sync (Alarm)  │     │  Manual Sync (User Click)    │
  │  Every 5 minutes    │     │  via popup.js "syncNow"      │
  │  chrome.alarms API  │     │  message to background.js    │
  └─────────┬───────────┘     └──────────────┬───────────────┘
            │                                │
            └───────────────┬────────────────┘
                            ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                  syncToBackend()                              │
  │                                                               │
  │  1. Read activities[] from chrome.storage.local               │
  │  2. If empty, skip                                            │
  │  3. POST to http://localhost:8000/api/activity/batch          │
  │     Body: { user_id: 1, activities: [...] }                   │
  │  4. On success: clear local activities[]                      │
  │  5. On failure: keep data locally, retry next cycle           │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 │  HTTP POST (JSON)
                                 ▼
```

---

## Layer 2: Popup UI (User Interaction)

```
  ┌──────────────────────────────────────────────────────────────┐
  │                 popup.html + popup.js                         │
  │                                                               │
  │  ┌────────────────────────────────────────┐                  │
  │  │  Tracking Status: [●] Running / Paused │                  │
  │  │                                        │                  │
  │  │  Today's Stats:                        │                  │
  │  │  ┌──────────┐  ┌──────────┐           │                  │
  │  │  │ 2.5 hrs  │  │ 0.8 hrs  │           │                  │
  │  │  │ Focused  │  │Distracted│           │                  │
  │  │  └──────────┘  └──────────┘           │                  │
  │  │                                        │                  │
  │  │  [Toggle Tracking] ← sendMessage('toggleTracking')       │
  │  │  [Sync Now]        ← sendMessage('syncNow')              │
  │  │  [Open Dashboard]  ← opens localhost:8000                 │
  │  └────────────────────────────────────────┘                  │
  │                                                               │
  │  On Load:                                                     │
  │    1. sendMessage('getStatus') → update toggle button         │
  │    2. Read chrome.storage.local → compute today's hours       │
  └──────────────────────────────────────────────────────────────┘
```

---

## Layer 3: FastAPI Backend (Python Server @ localhost:8000)

```
  ┌──────────────────────────────────────────────────────────��───┐
  │                     main.py (FastAPI)                         │
  │                                                               │
  │  Middleware: CORS (allow all origins for extension access)    │
  │  Data Store: In-memory list (activities_db) + dict (users_db)│
  │                                                               │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │                    API ENDPOINTS                        │  │
  │  │                                                         │  │
  │  │  GET  /                                                 │  │
  │  │  └─ Returns HTML Dashboard (embedded in main.py)        │  │
  │  │     └─ JS fetches /api/activity/summary/1 on load       │  │
  │  │                                                         │  │
  │  │  POST /api/activity/batch                               │  │
  │  │  └─ Receives: { user_id, activities[] }                 │  │
  │  │  └─ Appends each activity to activities_db              │  │
  │  │  └─ Returns: { success, message, total_activities }     │  │
  │  │                                                         │  │
  │  │  GET  /api/activity/summary/{user_id}                   │  │
  │  │  └─ Filters activities_db by user_id                    │  │
  │  │  └─ Calculates: total/productive/distraction hours      │  │
  │  │  └─ Computes: focus_score = productive/total * 100      │  │
  │  │  └─ Returns: stats + recent 10 activities               │  │
  │  │                                                         │  │
  │  │  GET  /api/activity/today/{user_id}                     │  │
  │  │  └─ Filters by user_id AND today's date                 │  │
  │  │  └─ Returns: today's activities                         │  │
  │  │                                                         │  │
  │  │  GET  /api/users/{user_id}                              │  │
  │  │  └─ Looks up users_db, returns user info                │  │
  │  │                                                         │  │
  │  │  GET  /health                                           │  │
  │  │  └─ Returns: { status, total_activities, total_users }  │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘
```

---

## Layer 4: Web Dashboard (Embedded HTML in main.py, served at "/")

```
  ┌──────────────────────────────────────────────────────────────┐
  │                  Dashboard (HTML/JS)                          │
  │                                                               │
  │  On page load → fetch('/api/activity/summary/1')              │
  │                                                               │
  │  Displays:                                                    │
  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
  │  │ Total   │ │Productive│ │Distracted│ │  Focus   │        │
  │  │ Hours   │ │  Hours   │ │  Hours   │ │  Score   │        │
  │  └─────────┘ └──────────┘ └──────────┘ └──────────┘        │
  │                                                               │
  │  Recent Activities List:                                      │
  │  ┌──────────────────────────────────────────────────┐        │
  │  │ domain | timestamp | category badge | duration   │        │
  │  └──────────────────────────────────────────────────┘        │
  │                                                               │
  │  [Refresh Button] → calls loadData() again                   │
  └──────────────────────────────────────────────────────────────┘
```

---

## Layer 5: AI Analysis Module (ai_analyzer.py - Standalone/Future Integration)

```
  ┌──────────────────────────────────────────────────────────────┐
  │                  ai_analyzer.py                               │
  │                                                               │
  │  Input: List of activity dicts                                │
  │                                                               │
  │  ┌─────────────────────────────────────────────────────┐     │
  │  │  analyze_productivity(activities)                     │     │
  │  │    │                                                  │     │
  │  │    ├─ calculate_stats(activities)                     │     │
  │  │    │   └─ total/productive/distraction/neutral hours  │     │
  │  │    │   └─ top 5 sites by duration                     │     │
  │  │    │   └─ productive_percent, distraction_percent     │     │
  │  │    │                                                  │     │
  │  │    ├─ format_top_sites(top_sites)                     │     │
  │  │    │   └─ Emoji-labeled site list                     │     │
  │  │    │                                                  │     │
  │  │    ├─ format_hourly_distribution(activities)          │     │
  │  │    │   └─ Peak activity hour                          │     │
  │  │    │                                                  │     │
  │  │    ├─ Build Gemini prompt (Chinese, 200-300 words)    │     │
  │  │    │                                                  │     │
  │  │    └─ generate_demo_response(stats)                   │     │
  │  │        └─ Score >= 70%: "Excellent!"                  │     │
  │  │        └─ Score >= 50%: "Good job!"                   │     │
  │  │        └─ Score <  50%: "Don't worry!"                │     │
  │  │        └─ Returns personalized tips                   │     │
  │  └─────────────────────────────────────────────────────┘     │
  │                                                               │
  │  ┌─────────────────────────────────────────────────────┐     │
  │  │  send_daily_email(user_email, summary, stats)        │     │
  │  │    └─ Generates styled HTML email template            │     │
  │  │    └─ Contains: stats cards + AI summary              │     │
  │  │    └─ (SMTP/SendGrid - placeholder, not connected)    │     │
  │  └─────────────────────────────────────────────────────┘     │
  └──────────────────────────────────────────────────────────────┘
```

---

## Complete Data Flow (End-to-End)

```
  User Browses Web
       │
       ▼
  background.js detects tab switch / URL change
       │
       ▼
  Calculates duration on previous page
       │
       ▼
  categorizeUrl() → productive / distraction / neutral
       │
       ▼
  Saves { url, domain, duration, timestamp, category }
  to chrome.storage.local
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
  [Every 5 min alarm]              [User clicks "Sync Now"
   OR                                in popup.js]
       │                                  │
       └──────────────┬───────────────────┘
                      ▼
  POST /api/activity/batch → main.py
  { user_id: 1, activities: [...] }
                      │
                      ▼
  activities_db.append(each activity)
                      │
            ┌─────────┼──────────┐
            ▼         ▼          ▼
     Dashboard    Summary    Today API
     GET /        GET /api/   GET /api/
                  summary/1   today/1
            │         │          │
            ▼         ▼          ▼
    HTML page    JSON stats   JSON list
    with JS      returned     returned
    charts
                      │
                      ▼
            ai_analyzer.py (future/manual)
                      │
              ┌───────┴────────┐
              ▼                ▼
      AI Analysis        Daily Email
      Report             (HTML template)
      (demo/Gemini)      (SMTP placeholder)
```

---

## Message Passing (Extension Internal Communication)

```
  popup.js                          background.js
  ────────                          ─────────────
     │                                    │
     │── { action: 'getStatus' } ────────>│
     │<──── { isTracking: true/false } ───│
     │                                    │
     │── { action: 'toggleTracking' } ───>│
     │<──── { isTracking: !prev } ────────│
     │                                    │
     │── { action: 'syncNow' } ──────────>│
     │<──── { success: true } ────────────│
     │                                    │
     │      (calls syncToBackend() )      │
```

---

## File Dependency Map

```
  manifest.json
    ├── registers → background.js (service_worker)
    └── registers → popup.html (default_popup)
                        └── loads → popup.js (<script src>)

  popup.js ──chrome.runtime.sendMessage──► background.js
  popup.js ──chrome.storage.local.get───► Chrome Storage
  background.js ──fetch()──────────────► main.py (localhost:8000)
  background.js ──chrome.storage.local──► Chrome Storage

  main.py (standalone server)
    └── ai_analyzer.py (importable module, not yet wired in main.py)
```

---

## Component Summary

| Component | File | Role |
|---|---|---|
| Extension Config | `extension/manifest.json` | Manifest V3, declares permissions (tabs, storage, alarms) |
| Tracking Engine | `extension/background.js` | Monitors tab switches/URL changes, categorizes URLs, stores locally, syncs every 5 min |
| Popup UI | `extension/popup.html` + `extension/popup.js` | Shows tracking status & today's stats, toggle/sync/dashboard buttons |
| Backend API | `backend/main.py` | FastAPI server with batch activity ingestion, summary/today/user endpoints, embedded HTML dashboard |
| AI Module | `backend/ai_analyzer.py` | Calculates stats, builds Gemini prompt, generates demo analysis report, email template |
| Dependencies | `backend/requirements.txt` | fastapi, uvicorn, pydantic |

---

## Key Architectural Notes

- **ai_analyzer.py is standalone** -- it is not imported or called by main.py yet. It runs independently via `python ai_analyzer.py` for demo purposes.
- **Data storage is in-memory** -- restarting the backend clears all data.
- **The email service is a placeholder** -- SMTP code is commented out.
- **Gemini API integration is a placeholder** -- currently returns a hardcoded demo response based on focus score thresholds.
