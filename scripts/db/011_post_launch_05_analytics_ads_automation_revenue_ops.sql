-- POST-LAUNCH 05 — Analytics, Ads, Automation & Revenue Operations
-- Safe migration for conversion tracking, UTM attribution, revenue operations and automation runs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS conversion_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES commercial_campaigns(id) ON DELETE SET NULL,
  value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'MXN',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  source_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS utm_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  landing_path TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, session_id)
);

CREATE TABLE IF NOT EXISTS revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  revenue_total NUMERIC(12,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  paid_order_count INTEGER DEFAULT 0,
  average_order_value NUMERIC(12,2) DEFAULT 0,
  unique_customer_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  cadence TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, job_type)
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  job_id UUID REFERENCES automation_jobs(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  criteria JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE TABLE IF NOT EXISTS customer_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  order_count INTEGER DEFAULT 0,
  paid_order_count INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  average_order_value NUMERIC(12,2) DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  repeat_purchase BOOLEAN DEFAULT FALSE,
  segment_slug TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE TABLE IF NOT EXISTS campaign_attribution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES commercial_campaigns(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  session_id TEXT,
  email TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  attributed_revenue NUMERIC(12,2) DEFAULT 0,
  attribution_model TEXT DEFAULT 'last_touch',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_store_type_created_at ON conversion_events(store_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_events_order_id ON conversion_events(order_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id ON conversion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_utm_sessions_store_campaign ON utm_sessions(store_id, utm_campaign, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_store_date ON revenue_snapshots(store_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_store_type ON automation_jobs(store_id, job_type);
CREATE INDEX IF NOT EXISTS idx_automation_runs_store_created_at ON automation_runs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_metrics_store_spent ON customer_metrics(store_id, total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_store_created_at ON campaign_attribution(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_attribution_campaign_id ON campaign_attribution(campaign_id);

INSERT INTO automation_jobs(store_id, job_type, name, cadence, enabled, config)
SELECT id, 'abandoned_cart_recovery', 'Abandoned cart recovery', 'hourly', true, '{"delayHours":2,"channel":"email"}'::jsonb
FROM stores
ON CONFLICT(store_id, job_type) DO NOTHING;

INSERT INTO automation_jobs(store_id, job_type, name, cadence, enabled, config)
SELECT id, 'review_request', 'Post-purchase review request', 'daily', true, '{"delayDays":5,"channel":"email"}'::jsonb
FROM stores
ON CONFLICT(store_id, job_type) DO NOTHING;

INSERT INTO automation_jobs(store_id, job_type, name, cadence, enabled, config)
SELECT id, 'rebuy_campaign', 'Rebuy campaign', 'weekly', true, '{"delayDays":30,"discountPercent":10}'::jsonb
FROM stores
ON CONFLICT(store_id, job_type) DO NOTHING;

INSERT INTO customer_segments(store_id, name, slug, description, criteria)
SELECT id, 'New customers', 'new-customers', 'Clientes con una compra o interacción inicial.', '{"paid_order_count":{"lte":1}}'::jsonb
FROM stores
ON CONFLICT(store_id, slug) DO NOTHING;

INSERT INTO customer_segments(store_id, name, slug, description, criteria)
SELECT id, 'Repeat customers', 'repeat-customers', 'Clientes con más de una compra pagada.', '{"paid_order_count":{"gte":2}}'::jsonb
FROM stores
ON CONFLICT(store_id, slug) DO NOTHING;

INSERT INTO operational_events(store_id, event_type, severity, message, metadata)
SELECT id, 'post_launch_05_migration_applied', 'info', 'POST-LAUNCH 05 analytics, ads, automation and revenue ops migration applied.', '{}'::jsonb
FROM stores
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
