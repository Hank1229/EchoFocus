-- EchoFocus — Hourly focus breakdown ("best focus hours")
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Additive only: existing synced_aggregates rows get 24 zeroed hours, which is
-- the truth for them — the extension had no hour buckets when they were synced.
--
-- 1. synced_aggregates.productive_by_hour — productive seconds per hour of the
--    user's LOCAL day, index 0 = 00:00–00:59. INTEGER[] rather than JSONB: the
--    payload is a fixed-length vector of counts, so the array type both states
--    that and lets a CHECK enforce the shape the dashboard grid relies on
--    (JSONB would accept objects, strings and nulls in the same column).
--    Only productive time is bucketed — the feature answers "when do I focus
--    best?", and the per-category totals already on the row cover the rest.
--    Privacy: durations only. No domains, URLs or titles ride along.
-- 2. No new grants. synced_aggregates carries table-level privileges for
--    anon/authenticated/service_role (no column-level ACLs, unlike
--    profiles after 002), so the new column inherits them; RLS still scopes
--    every row to auth.uid() = user_id via "Users can manage own aggregates".

-- ─── 1. productive_by_hour ───────────────────────────────────────────────────
ALTER TABLE public.synced_aggregates
  ADD COLUMN IF NOT EXISTS productive_by_hour INTEGER[] NOT NULL
    DEFAULT array_fill(0, ARRAY[24]);

-- Shape guard: exactly 24 buckets, no NULL elements. A short array or a NULL
-- element would reach the dashboard as a hole in the grid.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.synced_aggregates'::regclass
       AND conname = 'synced_aggregates_productive_by_hour_shape'
  ) THEN
    ALTER TABLE public.synced_aggregates
      ADD CONSTRAINT synced_aggregates_productive_by_hour_shape
      CHECK (
        array_length(productive_by_hour, 1) = 24
        AND array_position(productive_by_hour, NULL::INTEGER) IS NULL
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.synced_aggregates.productive_by_hour IS
  'Productive seconds per local hour (index 0 = 00:00). Durations only — never domains or URLs.';
