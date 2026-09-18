-- EchoFocus — 006: close the quota bypasses and tighten leftover grants
--
-- Audit findings this addresses:
-- 1. The daily cap read as 8/day but was 32/day in practice. The quota row was
--    keyed on the DATE THE CLIENT ASKED ABOUT, and ai-analyze accepts four of
--    them (today-2 … today+1), so a user got a fresh 8-generation bucket per
--    date. The bucket now comes from the server clock; p_date still selects
--    which analysis to hand back when the cap is hit.
-- 2. The weekly slot was refunded with a blind `count - 1` computed before the
--    Gemini call. Refunding is right when Google never generated anything, but
--    it has to be atomic, and the Edge Function now only calls it for failures
--    that cost no tokens.
-- 3. `anon` kept table-wide UPDATE/INSERT/DELETE on profiles — 002 revoked it
--    from `authenticated` only. RLS blocks it today; the grant should not be
--    the single remaining layer.
-- 4. handle_new_user() is SECURITY DEFINER with EXECUTE granted to PUBLIC. It
--    returns TRIGGER so a direct RPC call errors out, but the grant buys
--    nothing and the advisor flags it.

-- ─── 1. Daily quota: bucket on the server's day, not the requested day ───────
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
  -- The spend bucket. Deliberately NOT p_date: that one is client-supplied and
  -- the Edge Function accepts a four-day window around UTC today.
  v_bucket DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_count  INT;
  v_text   TEXT;
BEGIN
  SELECT a.analysis_text INTO v_text
    FROM public.ai_analyses a
   WHERE a.user_id = p_user_id AND a.date = p_date AND a.type = 'daily';

  -- Single statement: creates the day's row or increments it, but only while
  -- the count is under p_max. ON CONFLICT takes a row lock, so concurrent
  -- callers queue up instead of both reading a stale count. Over the limit the
  -- conditional DO UPDATE matches nothing and v_count stays NULL.
  INSERT INTO public.ai_generation_quota (user_id, date, generation_count, updated_at)
  VALUES (p_user_id, v_bucket, 1, NOW())
  ON CONFLICT (user_id, date) DO UPDATE
    SET generation_count = ai_generation_quota.generation_count + 1,
        updated_at = NOW()
    WHERE ai_generation_quota.generation_count < p_max
  RETURNING ai_generation_quota.generation_count INTO v_count;

  IF v_count IS NULL THEN
    SELECT q.generation_count INTO v_count
      FROM public.ai_generation_quota q
     WHERE q.user_id = p_user_id AND q.date = v_bucket;
    RETURN QUERY SELECT FALSE, COALESCE(v_count, p_max), v_text;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_count, v_text;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_generation(UUID, DATE, INT) TO service_role;

-- ─── 2. Atomic weekly refund ─────────────────────────────────────────────────
-- One slot per week is scarce enough that an upstream failure should not eat
-- it, but the give-back has to read and write in one statement.
CREATE OR REPLACE FUNCTION public.refund_ai_weekly_generation(
  p_user_id    UUID,
  p_week_start DATE
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_weekly_quota
     SET generation_count = GREATEST(0, generation_count - 1),
         updated_at = NOW()
   WHERE user_id = p_user_id AND week_start = p_week_start;
$$;

REVOKE ALL ON FUNCTION public.refund_ai_weekly_generation(UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_ai_weekly_generation(UUID, DATE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_weekly_generation(UUID, DATE) TO service_role;

-- ─── 3. profiles: drop the leftover anon grants ──────────────────────────────
-- Nothing in either client reads or writes profiles without a session, so anon
-- needs no privilege here at all.
REVOKE ALL ON public.profiles FROM anon;

-- ─── 4. handle_new_user(): remove the public EXECUTE grant ───────────────────
-- It runs from a trigger as the table owner; no role needs to call it directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
