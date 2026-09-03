-- EMERGENCY-DRY-03: Abandoned cart recovery locking / race-condition fix
-- Idempotent migration. Apply in Supabase before enabling the recovery job in production.

ALTER TABLE abandoned_carts
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_lock_id TEXT,
  ADD COLUMN IF NOT EXISTS recovery_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovery_claim
ON abandoned_carts(reminder_sent, recovery_locked_until, updated_at)
WHERE reminder_sent = FALSE AND email IS NOT NULL;

CREATE OR REPLACE FUNCTION claim_abandoned_carts_for_recovery(
  batch_limit INTEGER DEFAULT 25,
  lock_token TEXT DEFAULT NULL,
  older_than TIMESTAMPTZ DEFAULT NOW() - INTERVAL '2 hours'
)
RETURNS SETOF abandoned_carts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  effective_lock_token TEXT;
BEGIN
  effective_lock_token := COALESCE(NULLIF(lock_token, ''), gen_random_uuid()::text);

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM abandoned_carts
    WHERE reminder_sent = FALSE
      AND email IS NOT NULL
      AND updated_at < older_than
      AND (recovery_locked_until IS NULL OR recovery_locked_until < NOW())
    ORDER BY updated_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(batch_limit, 25), 100))
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE abandoned_carts ac
    SET recovery_lock_id = effective_lock_token,
        recovery_locked_until = NOW() + INTERVAL '15 minutes',
        recovery_attempts = COALESCE(ac.recovery_attempts, 0) + 1,
        recovery_last_attempt_at = NOW(),
        recovery_last_error = NULL
    FROM candidates c
    WHERE ac.id = c.id
    RETURNING ac.*
  )
  SELECT * FROM claimed;
END;
$$;

NOTIFY pgrst, 'reload schema';
