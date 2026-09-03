-- EMAIL PRODUCTION B: Queue, Webhooks & Deliverability
-- Idempotent migration for Supabase PostgreSQL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  purpose TEXT NOT NULL DEFAULT 'generic',
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by TEXT,
  locked_until TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  provider_status TEXT,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_next_attempt
  ON email_queue(status, next_attempt_at, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_email_queue_locked_until
  ON email_queue(locked_until);

CREATE INDEX IF NOT EXISTS idx_email_queue_provider_message_id
  ON email_queue(provider_message_id);

CREATE TABLE IF NOT EXISTS email_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES email_queue(id) ON DELETE CASCADE,
  request_id UUID,
  dedupe_key TEXT,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_attempts_queue_id
  ON email_delivery_attempts(queue_id);

CREATE TABLE IF NOT EXISTS email_suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, reason)
);

CREATE INDEX IF NOT EXISTS idx_email_suppression_active_email
  ON email_suppression_list(email, is_active);

ALTER TABLE email_events ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'resend';
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_email_events_provider_message_id
  ON email_events(provider_message_id);

CREATE INDEX IF NOT EXISTS idx_email_events_dedupe_key
  ON email_events(dedupe_key);

CREATE OR REPLACE FUNCTION claim_email_queue_for_delivery(
  batch_limit INTEGER DEFAULT 25,
  lock_token TEXT DEFAULT NULL
)
RETURNS SETOF email_queue
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
    FROM email_queue
    WHERE status = 'queued'
      AND scheduled_for <= NOW()
      AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
      AND attempts < max_attempts
      AND (locked_until IS NULL OR locked_until < NOW())
    ORDER BY scheduled_for ASC, created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(batch_limit, 25), 100))
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE email_queue q
    SET status = 'processing',
        locked_by = effective_lock_token,
        locked_until = NOW() + INTERVAL '10 minutes',
        attempts = COALESCE(q.attempts, 0) + 1,
        updated_at = NOW()
    FROM candidates c
    WHERE q.id = c.id
    RETURNING q.*
  )
  SELECT * FROM claimed;
END;
$$;

NOTIFY pgrst, 'reload schema';
