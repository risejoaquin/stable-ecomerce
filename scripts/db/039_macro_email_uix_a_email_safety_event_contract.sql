-- MACRO EMAIL/UIX A — Email safety event contract
-- Safe/idempotent migration for current email observability table.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE email_events ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'generic';
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'resend';
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_order_id ON email_events(order_id);
CREATE INDEX IF NOT EXISTS idx_email_events_user_id ON email_events(user_id);
CREATE INDEX IF NOT EXISTS idx_email_events_email_created_at ON email_events(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_event_status_created_at ON email_events(event_type, status, created_at DESC);

NOTIFY pgrst, 'reload schema';
