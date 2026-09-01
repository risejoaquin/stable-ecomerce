-- POST-LAUNCH 28 — Executive Operating System, KPI Command Center & Business Intelligence
-- Safe/idempotent migration for executive KPIs, command center, business health,
-- funnel analytics, channel/campaign comparison, executive priorities, investor reports and BI insights.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION pl28_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS executive_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily',
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  retention_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  operations_score INTEGER NOT NULL DEFAULT 0,
  technical_health_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS business_command_center_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'executive_command_center',
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  active_campaigns INTEGER NOT NULL DEFAULT 0,
  alerts_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE TABLE IF NOT EXISTS daily_commercial_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  business_date DATE NOT NULL DEFAULT CURRENT_DATE,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  cac_cents INTEGER NOT NULL DEFAULT 0,
  roas NUMERIC(10,4) NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'checked',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS daily_technical_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  health_date DATE NOT NULL DEFAULT CURRENT_DATE,
  uptime_score INTEGER NOT NULL DEFAULT 0,
  latency_p95_ms INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  diagnostics_score INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'checked',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS full_funnel_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  visitors INTEGER NOT NULL DEFAULT 0,
  product_views INTEGER NOT NULL DEFAULT 0,
  add_to_carts INTEGER NOT NULL DEFAULT 0,
  checkouts INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'measured',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS channel_campaign_comparison_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'direct',
  campaign_name TEXT NOT NULL DEFAULT 'baseline',
  spend_cents INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  roas NUMERIC(10,4) NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'compared',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE TABLE IF NOT EXISTS executive_decision_priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  priority_key TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'growth',
  priority_level TEXT NOT NULL DEFAULT 'medium',
  impact_score INTEGER NOT NULL DEFAULT 0,
  effort_score INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, priority_key)
);

CREATE TABLE IF NOT EXISTS board_investor_reporting_packets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  packet_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  growth_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  retention_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, packet_key)
);

CREATE TABLE IF NOT EXISTS business_intelligence_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  insight_key TEXT NOT NULL,
  insight_type TEXT NOT NULL DEFAULT 'growth',
  severity TEXT NOT NULL DEFAULT 'medium',
  confidence_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  insight TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, insight_key)
);

CREATE TABLE IF NOT EXISTS operating_system_review_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  run_key TEXT NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'weekly_business_review',
  status TEXT NOT NULL DEFAULT 'completed',
  executive_summary TEXT,
  action_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, run_key)
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'executive_kpi_snapshots','business_command_center_reports','daily_commercial_health_checks',
    'daily_technical_health_checks','full_funnel_analytics_snapshots','channel_campaign_comparison_reports',
    'executive_decision_priorities','board_investor_reporting_packets','business_intelligence_insights',
    'operating_system_review_runs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION pl28_set_updated_at()', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_executive_kpi_snapshots_store_created ON executive_kpi_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_command_center_reports_store_created ON business_command_center_reports(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_commercial_health_checks_store_date ON daily_commercial_health_checks(store_id, business_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_technical_health_checks_store_date ON daily_technical_health_checks(store_id, health_date DESC);
CREATE INDEX IF NOT EXISTS idx_full_funnel_analytics_snapshots_store_created ON full_funnel_analytics_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_campaign_comparison_reports_store_channel ON channel_campaign_comparison_reports(store_id, channel);
CREATE INDEX IF NOT EXISTS idx_executive_decision_priorities_store_status ON executive_decision_priorities(store_id, status, priority_level);
CREATE INDEX IF NOT EXISTS idx_board_investor_reporting_packets_store_period ON board_investor_reporting_packets(store_id, period);
CREATE INDEX IF NOT EXISTS idx_business_intelligence_insights_store_type ON business_intelligence_insights(store_id, insight_type, severity);
CREATE INDEX IF NOT EXISTS idx_operating_system_review_runs_store_type ON operating_system_review_runs(store_id, review_type);

INSERT INTO executive_kpi_snapshots (store_id, snapshot_key, period, revenue_cents, conversion_rate, retention_rate, operations_score, technical_health_score, status, recommendation, metadata)
SELECT s.id, 'pl28-baseline-executive-kpis', 'daily', 0, 0, 0, 92, 95, 'active',
       'Review executive KPIs daily across revenue, conversion, retention, operations and technical health.',
       '{"source":"pl28_seed"}'::jsonb
FROM stores s
ORDER BY s.created_at ASC
LIMIT 1
ON CONFLICT (store_id, snapshot_key) DO NOTHING;

INSERT INTO business_command_center_reports (store_id, report_key, report_type, revenue_cents, orders_count, conversion_rate, active_campaigns, alerts_count, status, recommendation, metadata)
SELECT s.id, 'pl28-baseline-command-center', 'executive_command_center', 0, 0, 0, 1, 0, 'active',
       'Use the command center to centralize growth, operations, health, funnel, campaign and priority decisions.',
       '{"source":"pl28_seed"}'::jsonb
FROM stores s
ORDER BY s.created_at ASC
LIMIT 1
ON CONFLICT (store_id, report_key) DO NOTHING;

INSERT INTO operating_system_review_runs (store_id, run_key, review_type, status, executive_summary, action_count, score, recommendation, metadata)
SELECT s.id, 'pl28-baseline-operating-review', 'weekly_business_review', 'completed',
       'Executive operating system baseline established for KPI reviews and business intelligence decisions.', 3, 93,
       'Run weekly operating reviews and turn BI insights into prioritized actions.',
       '{"source":"pl28_seed"}'::jsonb
FROM stores s
ORDER BY s.created_at ASC
LIMIT 1
ON CONFLICT (store_id, run_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
