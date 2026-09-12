-- EchoFocus Phase 0 — Security Hotfix Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Changes:
-- 1. Lock profiles.email against client updates. The email column mirrors the
--    verified auth.users email (set by the handle_new_user trigger) and is used
--    for display; column-level grants now let authenticated users update only
--    display_name, preferred_language, timezone and updated_at. RLS policies
--    are unchanged.
-- 2. ai_generation_quota — per-user-per-day Gemini generation counter used by
--    the ai-analyze Edge Function, plus consume_ai_generation() which checks
--    and increments it atomically. The counter lives in its own table that no
--    client role may touch, so it cannot be reset from the browser.
-- 3. Lock ai_analyses against client INSERT/UPDATE. Only the Edge Function
--    (service role) writes analyses; clients read them and may still DELETE
--    them (the "delete my cloud data" button relies on it).
-- 4. Index custom_rules(user_id) — the FK was unindexed (audit finding),
--    slowing per-user rule lookups and cascade deletes.
--
-- Idempotent where possible (IF NOT EXISTS); the REVOKE/GRANT pairs are safe to
-- re-run because GRANT/REVOKE are inherently repeatable.

-- ─── 1. Lock profiles.email (and id / created_at) from client updates ────────
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, preferred_language, timezone, updated_at)
  ON public.profiles TO authenticated;

-- ─── 2. AI generation rate-limit counter ─────────────────────────────────────
-- Kept out of ai_analyses on purpose: analyses are client-deletable (privacy
-- feature), and a deletable counter is not a rate limit.
CREATE TABLE IF NOT EXISTS public.ai_generation_quota (
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  generation_count  INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- No RLS policies and no grants: the table is reachable only through the
-- service role and the SECURITY DEFINER function below.
ALTER TABLE public.ai_generation_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_generation_quota FROM anon, authenticated;

-- Atomically reserve one generation for (user, date).
-- Returns allowed = false (without incrementing) once p_max is reached, along
-- with the analysis already stored for that day so the caller can serve it.
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
   WHERE a.user_id = p_user_id AND a.date = p_date;

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

-- Only the Edge Function may call it — otherwise any signed-in user could burn
-- another user's quota by passing a different p_user_id.
REVOKE ALL ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) TO service_role;

-- ─── 3. Lock ai_analyses writes to the Edge Function ─────────────────────────
-- Clients only ever read analyses (dashboard + export) or delete them all
-- (settings → delete cloud data), so INSERT/UPDATE have no legitimate client
-- use. SELECT and DELETE stay granted; RLS still scopes both to the owner.
REVOKE INSERT, UPDATE ON public.ai_analyses FROM authenticated, anon;

-- ─── 4. Index the unindexed custom_rules.user_id foreign key ─────────────────
CREATE INDEX IF NOT EXISTS idx_custom_rules_user_id
  ON public.custom_rules(user_id);
