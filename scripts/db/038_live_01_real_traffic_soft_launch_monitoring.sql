-- LIVE-01 — Real Traffic Soft Launch, Live Monitoring & Launch Feedback Control
-- Creates operational tables for a controlled real-traffic launch after the UI redesign.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS live_soft_launch_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  run_key TEXT NOT NULL,
  launch_name TEXT NOT NULL DEFAULT 'Real Traffic Soft Launch',
  launch_stage TEXT NOT NULL DEFAULT 'soft_launch',
  status TEXT NOT NULL DEFAULT 'active',
  traffic_source TEXT DEFAULT 'mixed',
  target_sessions INTEGER DEFAULT 100,
  actual_sessions INTEGER DEFAULT 0,
  conversion_rate NUMERIC(10,4) DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, run_key)
);

CREATE TABLE IF NOT EXISTS live_traffic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  session_key TEXT NOT NULL,
  channel TEXT DEFAULT 'direct',
  landing_path TEXT DEFAULT '/',
  device_type TEXT DEFAULT 'mobile',
  browser TEXT,
  country TEXT DEFAULT 'MX',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  pageviews INTEGER DEFAULT 1,
  cart_created BOOLEAN DEFAULT FALSE,
  checkout_started BOOLEAN DEFAULT FALSE,
  purchased BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, session_key)
);

CREATE TABLE IF NOT EXISTS live_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  event_key TEXT NOT NULL,
  session_key TEXT,
  event_type TEXT NOT NULL DEFAULT 'view_product',
  funnel_step TEXT DEFAULT 'discovery',
  channel TEXT DEFAULT 'direct',
  value_cents INTEGER DEFAULT 0,
  friction_signal TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_key)
);

CREATE TABLE IF NOT EXISTS live_checkout_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  observation_key TEXT NOT NULL,
  session_key TEXT,
  checkout_step TEXT DEFAULT 'payment',
  status TEXT DEFAULT 'observed',
  issue_type TEXT,
  severity TEXT DEFAULT 'low',
  abandoned BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  recommendation TEXT,
  observed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, observation_key)
);

CREATE TABLE IF NOT EXISTS live_order_revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  event_key TEXT NOT NULL,
  order_id UUID,
  revenue_cents INTEGER DEFAULT 0,
  channel TEXT DEFAULT 'direct',
  payment_status TEXT DEFAULT 'paid',
  attribution_source TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_key)
);

CREATE TABLE IF NOT EXISTS live_support_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  signal_key TEXT NOT NULL,
  customer_email TEXT,
  signal_type TEXT DEFAULT 'question',
  channel TEXT DEFAULT 'whatsapp',
  severity TEXT DEFAULT 'low',
  status TEXT DEFAULT 'open',
  resolution_notes TEXT,
  recommendation TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, signal_key)
);

CREATE TABLE IF NOT EXISTS live_campaign_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  snapshot_key TEXT NOT NULL,
  campaign_name TEXT DEFAULT 'soft_launch_campaign',
  channel TEXT DEFAULT 'paid_social',
  spend_cents INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  cac_cents INTEGER DEFAULT 0,
  roas NUMERIC(10,4) DEFAULT 0,
  health_status TEXT DEFAULT 'monitoring',
  recommendation TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS live_incident_watch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  incident_key TEXT NOT NULL,
  incident_type TEXT DEFAULT 'operational_watch',
  severity TEXT DEFAULT 'low',
  status TEXT DEFAULT 'open',
  affected_area TEXT DEFAULT 'storefront',
  impact_summary TEXT,
  action_taken TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, incident_key)
);

CREATE TABLE IF NOT EXISTS launch_iteration_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  action_key TEXT NOT NULL,
  action_type TEXT DEFAULT 'conversion_fix',
  priority TEXT DEFAULT 'medium',
  title TEXT NOT NULL DEFAULT 'Launch iteration action',
  owner_role TEXT DEFAULT 'admin',
  status TEXT DEFAULT 'open',
  impact_score INTEGER DEFAULT 75,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, action_key)
);

CREATE TABLE IF NOT EXISTS live_launch_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  report_key TEXT NOT NULL,
  report_date DATE DEFAULT CURRENT_DATE,
  sessions INTEGER DEFAULT 0,
  conversion_rate NUMERIC(10,4) DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  support_signals INTEGER DEFAULT 0,
  incidents INTEGER DEFAULT 0,
  open_actions INTEGER DEFAULT 0,
  executive_summary TEXT,
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE INDEX IF NOT EXISTS idx_live_traffic_sessions_store_created ON live_traffic_sessions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_conversion_events_store_created ON live_conversion_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_checkout_observations_store_created ON live_checkout_observations(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_campaign_health_snapshots_store_created ON live_campaign_health_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_launch_iteration_actions_store_status ON launch_iteration_actions(store_id, status);

NOTIFY pgrst, 'reload schema';
