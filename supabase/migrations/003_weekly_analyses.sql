-- EchoFocus — Weekly AI summaries
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Additive only: existing ai_analyses rows become type = 'daily'.
--
-- 1. ai_analyses.type — 'daily' | 'weekly'. The unique key widens from
--    (user_id, date) to (user_id, date, type) so a weekly retrospective can
--    share its end date with that day's daily analysis.
-- 2. consume_ai_generation() is replaced to scope its analysis_text lookup to
--    type = 'daily'; otherwise the daily 429 path could hand back the weekly
--    text for the same date.
-- 3. ai_weekly_quota + consume_ai_weekly_generation() — one weekly generation
--    per user per ISO week. The week bucket is derived from the server clock,
--    never from the request, so a client cannot mint a fresh bucket. Like the
--    daily counter, the table is unreachable from client roles.

-- ─── 1. ai_analyses.type ─────────────────────────────────────────────────────
ALTER TABLE public.ai_analyses
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'daily'
  CHECK (type IN ('daily', 'weekly'));

ALTER TABLE public.ai_analyses DROP CONSTRAINT IF EXISTS ai_analyses_user_id_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.ai_analyses'::regclass
       AND conname = 'ai_analyses_user_id_date_type_key'
  ) THEN
    ALTER TABLE public.ai_analyses
      ADD CONSTRAINT ai_analyses_user_id_date_type_key UNIQUE (user_id, date, type);
  END IF;
END
$$;

-- Serves both "latest analysis of a kind" lookups and the per-kind history list.
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_type_date
  ON public.ai_analyses(user_id, type, date DESC);

-- ─── 2. Scope the daily quota's cached-text lookup to daily analyses ─────────
CREATE OR REPLACE FUNCTION public.consume_ai_generation(
  p_user_id UUID,
  p_date    DATE,
  p_max     INT
)
RETURNS TABLE (allowed BOOLEAN, generation_count INT, analysis_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_text  TEXT;
BEGIN
  SELECT a.analysis_text INTO v_text
    FROM public.ai_analyses a
   WHERE a.user_id = p_user_id AND a.date = p_date AND a.type = 'daily';

  -- Single statement: creates the day's row or increments it, but only while
  -- the count is under p_max. ON CONFLICT takes a row lock, so concurrent
  -- callers queue up instead of both reading a stale count. Over the limit the
  -- conditional DO UPDATE matches nothing and v_count stays NULL.
  INSERT INTO public.ai_generation_quota (user_id, date, generation_count, updated_at)
  VALUES (p_user_id, p_date, 1, NOW())
  ON CONFLICT (user_id, date) DO UPDATE
    SET generation_count = ai_generation_quota.generation_count + 1,
        updated_at = NOW()
    WHERE ai_generation_quota.generation_count < p_max
  RETURNING ai_generation_quota.generation_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT q.generation_count INTO v_count
      FROM public.ai_generation_quota q
     WHERE q.user_id = p_user_id AND q.date = p_date;
    RETURN QUERY SELECT FALSE, COALESCE(v_count, p_max), v_text;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_count, v_text;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) TO service_role;

-- ─── 3. Weekly generation counter ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_weekly_quota (
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start        DATE NOT NULL,
  generation_count  INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, week_start)
);

ALTER TABLE public.ai_weekly_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_weekly_quota FROM anon, authenticated;

-- Reserve one weekly generation for the ISO week the server is currently in.
-- Over the limit it returns the user's most recent weekly analysis so the
-- caller can serve that instead.
CREATE OR REPLACE FUNCTION public.consume_ai_weekly_generation(
  p_user_id UUID,
  p_max     INT
)
RETURNS TABLE (allowed BOOLEAN, generation_count INT, week_start DATE, analysis_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week  DATE := (DATE_TRUNC('week', (NOW() AT TIME ZONE 'UTC')))::DATE;
  v_count INT;
  v_text  TEXT;
BEGIN
  SELECT a.analysis_text INTO v_text
    FROM public.ai_analyses a
   WHERE a.user_id = p_user_id AND a.type = 'weekly'
   ORDER BY a.date DESC
   LIMIT 1;

  -- Conflict target named by constraint, not by column: week_start is also an
  -- OUT parameter here, and an unqualified column list would be ambiguous.
  INSERT INTO public.ai_weekly_quota (user_id, week_start, generation_count, updated_at)
  VALUES (p_user_id, v_week, 1, NOW())
  ON CONFLICT ON CONSTRAINT ai_weekly_quota_pkey DO UPDATE
    SET generation_count = ai_weekly_quota.generation_count + 1,
        updated_at = NOW()
    WHERE ai_weekly_quota.generation_count < p_max
  RETURNING ai_weekly_quota.generation_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT q.generation_count INTO v_count
      FROM public.ai_weekly_quota q
     WHERE q.user_id = p_user_id AND q.week_start = v_week;
    RETURN QUERY SELECT FALSE, COALESCE(v_count, p_max), v_week, v_text;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_count, v_week, v_text;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_weekly_generation(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_weekly_generation(UUID, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_weekly_generation(UUID, INT) TO service_role;
