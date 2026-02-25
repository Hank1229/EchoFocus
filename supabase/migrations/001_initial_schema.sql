-- EchoFocus Phase 2 — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- IMPORTANT: Raw browsing URLs never stored here. Only aggregated stats + user prefs.

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Extended user profile. Auto-populated on first sign-in via trigger below.
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email         TEXT NOT NULL,
  display_name  TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'zh-TW',
  timezone      TEXT NOT NULL DEFAULT 'Asia/Taipei',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─── User Preferences ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_report_enabled  BOOLEAN NOT NULL DEFAULT true,
  email_report_time     TIME NOT NULL DEFAULT '20:00',
  ai_analysis_enabled   BOOLEAN NOT NULL DEFAULT true,
  idle_timeout_minutes  INT NOT NULL DEFAULT 2,
  data_retention_days   INT NOT NULL DEFAULT 30,
  daily_goal_minutes    INT NOT NULL DEFAULT 360,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- ─── Custom Classification Rules ──────────────────────────────────────────────
-- Synced from extension chrome.storage for cross-device backup.
CREATE TABLE IF NOT EXISTS custom_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pattern     TEXT NOT NULL,
  match_type  TEXT NOT NULL CHECK (match_type IN ('exact', 'wildcard', 'path')),
  category    TEXT NOT NULL CHECK (category IN ('productive', 'distraction', 'neutral', 'uncategorized')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rules"
  ON custom_rules FOR ALL
  USING (auth.uid() = user_id);

-- ─── Synced Daily Aggregates ──────────────────────────────────────────────────
-- Extension posts anonymized daily aggregates here (domain names + durations only,
-- NEVER raw URLs or page titles). Dashboard reads from this table.
CREATE TABLE IF NOT EXISTS synced_aggregates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  total_seconds         INT NOT NULL DEFAULT 0,
  productive_seconds    INT NOT NULL DEFAULT 0,
  distraction_seconds   INT NOT NULL DEFAULT 0,
  neutral_seconds       INT NOT NULL DEFAULT 0,
  uncategorized_seconds INT NOT NULL DEFAULT 0,
  focus_score           INT NOT NULL DEFAULT 0,
  top_domains           JSONB NOT NULL DEFAULT '[]',
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE synced_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own aggregates"
  ON synced_aggregates FOR ALL
  USING (auth.uid() = user_id);

-- ─── AI Analyses ──────────────────────────────────────────────────────────────
-- Stores AI-generated insights (Phase 3). Schema created now.
-- aggregated_input: anonymized stats sent to AI (no URLs, only domains + durations)
CREATE TABLE IF NOT EXISTS ai_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  aggregated_input  JSONB,
  analysis_text     TEXT,
  focus_score       INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own analyses"
  ON ai_analyses FOR ALL
  USING (auth.uid() = user_id);

-- ─── Auto-create profile on sign-up ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
