-- POST-LAUNCH 25 — Controlled Marketing Launch, Paid Traffic Activation & Revenue Validation
-- Safe/idempotent production migration for Selfcare Sinners.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS controlled_marketing_launches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  launch_key TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Controlled marketing launch',
  channel TEXT NOT NULL DEFAULT 'mixed',
  status TEXT NOT NULL DEFAULT 'planned',
  budget_cents INTEGER NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  traffic_goal INTEGER NOT NULL DEFAULT 0,
  revenue_goal_cents INTEGER NOT NULL DEFAULT 0,
  decision TEXT DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, launch_key)
);

CREATE TABLE IF NOT EXISTS paid_traffic_campaign_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  run_key TEXT NOT NULL,
  campaign_name TEXT NOT NULL DEFAULT 'Paid traffic campaign run',
  platform TEXT NOT NULL DEFAULT 'meta',
  objective TEXT NOT NULL DEFAULT 'conversion',
  status TEXT NOT NULL DEFAULT 'planned',
  spend_cents INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  cpc_cents INTEGER DEFAULT 0,
  cpm_cents INTEGER DEFAULT 0,
  roas NUMERIC(10,2) DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, run_key)
);

CREATE TABLE IF NOT EXISTS revenue_validation_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'controlled_launch',
  gross_revenue_cents INTEGER NOT NULL DEFAULT 0,
  net_revenue_cents INTEGER NOT NULL DEFAULT 0,
  paid_orders INTEGER NOT NULL DEFAULT 0,
  average_order_value_cents INTEGER NOT NULL DEFAULT 0,
  refund_rate NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'baseline',
  score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS cac_roas_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  measurement_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'paid_social',
  spend_cents INTEGER NOT NULL DEFAULT 0,
  acquired_customers INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  cac_cents INTEGER DEFAULT 0,
  roas NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'measured',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, measurement_key)
);

CREATE TABLE IF NOT EXISTS landing_page_conversion_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  landing_slug TEXT NOT NULL DEFAULT 'homepage',
  source_channel TEXT NOT NULL DEFAULT 'paid',
  visits INTEGER NOT NULL DEFAULT 0,
  add_to_carts INTEGER NOT NULL DEFAULT 0,
  checkouts INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'baseline',
  score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS checkout_live_monitoring_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'checkout_monitoring',
  checkout_step TEXT NOT NULL DEFAULT 'payment',
  status TEXT NOT NULL DEFAULT 'observed',
  severity TEXT NOT NULL DEFAULT 'low',
  session_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  impact_score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_key)
);

CREATE TABLE IF NOT EXISTS campaign_adjustment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  adjustment_key TEXT NOT NULL,
  campaign_area TEXT NOT NULL DEFAULT 'creative',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  issue TEXT NOT NULL DEFAULT 'Campaign optimization item',
  action TEXT NOT NULL DEFAULT 'Review and optimize',
  expected_impact TEXT DEFAULT 'Improve conversion efficiency',
  score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, adjustment_key)
);

CREATE TABLE IF NOT EXISTS investment_scaling_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  decision_key TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'hold',
  confidence TEXT NOT NULL DEFAULT 'medium',
  reason TEXT NOT NULL DEFAULT 'Await controlled marketing validation',
  recommended_budget_cents INTEGER DEFAULT 0,
  guardrails JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  score INTEGER DEFAULT 0,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, decision_key)
);

CREATE TABLE IF NOT EXISTS marketing_launch_readiness_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'launch_readiness',
  status TEXT NOT NULL DEFAULT 'ready',
  score INTEGER DEFAULT 0,
  requirement TEXT NOT NULL DEFAULT 'Marketing launch readiness requirement',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS traffic_quality_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'paid_social',
  traffic_quality_score INTEGER DEFAULT 0,
  bounce_rate NUMERIC(10,2) DEFAULT 0,
  engaged_sessions INTEGER DEFAULT 0,
  suspicious_sessions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'measured',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE INDEX IF NOT EXISTS idx_controlled_marketing_launches_store_status ON controlled_marketing_launches(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paid_traffic_campaign_runs_store_status ON paid_traffic_campaign_runs(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_validation_snapshots_store_period ON revenue_validation_snapshots(store_id, period, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cac_roas_measurements_store_channel ON cac_roas_measurements(store_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_page_conversion_checks_store_slug ON landing_page_conversion_checks(store_id, landing_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_live_monitoring_events_store_severity ON checkout_live_monitoring_events(store_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_adjustment_items_store_status ON campaign_adjustment_items(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investment_scaling_decisions_store_status ON investment_scaling_decisions(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_launch_readiness_checks_store_area ON marketing_launch_readiness_checks(store_id, area, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_quality_reports_store_channel ON traffic_quality_reports(store_id, channel, created_at DESC);

INSERT INTO controlled_marketing_launches(store_id, launch_key, name, channel, status, budget_cents, traffic_goal, revenue_goal_cents, decision, score, recommendation, metadata)
SELECT id, 'pl25-controlled-launch-baseline', 'PL25 controlled paid traffic launch', 'mixed', 'ready', 500000, 1000, 1500000, 'launch_controlled_budget', 91, 'Launch with strict daily budget, checkout monitoring and ROAS review before scaling.', '{"source":"pl25_seed"}'::jsonb
FROM stores
ON CONFLICT(store_id, launch_key) DO NOTHING;

INSERT INTO marketing_launch_readiness_checks(store_id, check_key, area, status, score, requirement, recommendation, metadata)
SELECT id, 'checkout_tracking_ready', 'checkout_monitoring', 'ready', 92, 'Checkout must be monitored while paid traffic is active.', 'Review failures and abandonment every day during controlled launch.', '{"source":"pl25_seed"}'::jsonb
FROM stores
ON CONFLICT(store_id, check_key) DO NOTHING;

INSERT INTO investment_scaling_decisions(store_id, decision_key, decision, confidence, reason, recommended_budget_cents, guardrails, status, score, metadata)
SELECT id, 'pl25-initial-scale-decision', 'hold_until_revenue_validation', 'medium', 'Scale only after CAC/ROAS, landing conversion and checkout behavior are validated.', 0, '["positive_roas", "stable_checkout", "acceptable_cac", "no_payment_incidents"]'::jsonb, 'draft', 88, '{"source":"pl25_seed"}'::jsonb
FROM stores
ON CONFLICT(store_id, decision_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
