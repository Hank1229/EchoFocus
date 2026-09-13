-- 004's shape guard let a zero-length array through: array_length('{}', 1)
-- returns NULL, and a CHECK only rejects FALSE, so '{}' satisfied it.

ALTER TABLE public.synced_aggregates
  DROP CONSTRAINT IF EXISTS synced_aggregates_productive_by_hour_shape;

ALTER TABLE public.synced_aggregates
  ADD CONSTRAINT synced_aggregates_productive_by_hour_shape
  CHECK (
    COALESCE(array_length(productive_by_hour, 1), 0) = 24
    AND array_ndims(productive_by_hour) = 1
    AND array_position(productive_by_hour, NULL::INTEGER) IS NULL
  );
