-- POST-LAUNCH 26 — Live Operations Monitoring, Conversion Optimization & Growth Iteration Loop
-- Safe/idempotent migration for live operations, real sales measurements, channel behavior,
-- conversion experiments, A/B prioritization, bottlenecks, campaign iterations, risk/cost control
-- and continuous improvement reporting.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION pl26_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS live_operations_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'monitoring',
  real_sales_count INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  active_issues INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS real_sales_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  measurement_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'all',
  orders_count INTEGER NOT NULL DEFAULT 0,
  gross_revenue_cents INTEGER NOT NULL DEFAULT 0,
  net_revenue_cents INTEGER NOT NULL DEFAULT 0,
  average_order_value_cents INTEGER NOT NULL DEFAULT 0,
  refunds_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'measured',
  score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, measurement_key)
);

CREATE TABLE IF NOT EXISTS channel_behavior_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  analytics_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'unknown',
  sessions INTEGER NOT NULL DEFAULT 0,
  engaged_sessions INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  bounce_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'observed',
  score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, analytics_key)
);

CREATE TABLE IF NOT EXISTS conversion_optimization_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  experiment_key TEXT NOT NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  variant_a TEXT,
  variant_b TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  priority TEXT NOT NULL DEFAULT 'medium',
  expected_impact TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, experiment_key)
);

CREATE TABLE IF NOT EXISTS ab_test_prioritization_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  priority_key TEXT NOT NULL,
  experiment_area TEXT NOT NULL,
  effort_score INTEGER NOT NULL DEFAULT 1,
  impact_score INTEGER NOT NULL DEFAULT 1,
  priority_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'prioritized',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, priority_key)
);

CREATE TABLE IF NOT EXISTS commercial_bottleneck_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  bottleneck_area TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  impact_score INTEGER NOT NULL DEFAULT 0,
  root_cause TEXT,
  recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE TABLE IF NOT EXISTS campaign_iteration_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  iteration_key TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'mixed',
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  spend_delta_cents INTEGER NOT NULL DEFAULT 0,
  expected_impact TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, iteration_key)
);

CREATE TABLE IF NOT EXISTS risk_cost_control_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  spend_cents INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  roas NUMERIC(10,4) NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  cost_status TEXT NOT NULL DEFAULT 'controlled',
  score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS growth_iteration_loop_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL,
  area TEXT NOT NULL,
  action TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  owner TEXT,
  due_at TIMESTAMPTZ,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, action_key)
);

CREATE TABLE IF NOT EXISTS continuous_improvement_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'weekly',
  status TEXT NOT NULL DEFAULT 'active',
  score INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'live_operations_snapshots','real_sales_measurements','channel_behavior_analytics',
    'conversion_optimization_experiments','ab_test_prioritization_items','commercial_bottleneck_reports',
    'campaign_iteration_records','risk_cost_control_snapshots','growth_iteration_loop_actions',
    'continuous_improvement_reports'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION pl26_set_updated_at()', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_live_operations_snapshots_store_created ON live_operations_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_real_sales_measurements_store_channel ON real_sales_measurements(store_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_behavior_analytics_store_channel ON channel_behavior_analytics(store_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_optimization_experiments_store_status ON conversion_optimization_experiments(store_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_ab_test_prioritization_items_store_priority ON ab_test_prioritization_items(store_id, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_bottleneck_reports_store_severity ON commercial_bottleneck_reports(store_id, severity, status);
CREATE INDEX IF NOT EXISTS idx_campaign_iteration_records_store_channel ON campaign_iteration_records(store_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_cost_control_snapshots_store_created ON risk_cost_control_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_iteration_loop_actions_store_status ON growth_iteration_loop_actions(store_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_continuous_improvement_reports_store_created ON continuous_improvement_reports(store_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
