-- POST-LAUNCH 30 + 31 + 32 / MACROFASE FINAL A
-- Experimentation Platform, Real Integrations Layer, Financial Forecasting & Unit Economics
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION set_updated_at_macro_final_a()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS ab_experiment_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  experiment_key TEXT NOT NULL,
  experiment_name TEXT NOT NULL,
  hypothesis TEXT,
  area TEXT DEFAULT 'conversion',
  target_metric TEXT DEFAULT 'conversion_rate',
  status TEXT DEFAULT 'draft',
  priority INTEGER DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, experiment_key)
);

CREATE TABLE IF NOT EXISTS ab_experiment_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  experiment_key TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  allocation_percent NUMERIC(5,2) DEFAULT 50,
  traffic_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  revenue_cents BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, experiment_key, variant_key)
);

CREATE TABLE IF NOT EXISTS conversion_learning_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  learning_key TEXT NOT NULL,
  experiment_key TEXT,
  winning_variant TEXT,
  conversion_lift_percent NUMERIC(10,2) DEFAULT 0,
  confidence_score NUMERIC(10,2) DEFAULT 0,
  revenue_impact_cents BIGINT DEFAULT 0,
  status TEXT DEFAULT 'measured',
  insight TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, learning_key)
);

CREATE TABLE IF NOT EXISTS experiment_decision_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  decision_key TEXT NOT NULL,
  experiment_key TEXT,
  decision TEXT DEFAULT 'continue',
  reason TEXT,
  expected_impact TEXT,
  status TEXT DEFAULT 'recorded',
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, decision_key)
);

CREATE TABLE IF NOT EXISTS external_integration_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  connection_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  status TEXT DEFAULT 'configured',
  last_sync_at TIMESTAMPTZ,
  health_score NUMERIC(10,2) DEFAULT 100,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, connection_key)
);

CREATE TABLE IF NOT EXISTS email_provider_sync_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  sync_key TEXT NOT NULL,
  provider TEXT DEFAULT 'resend',
  event_type TEXT DEFAULT 'contact_sync',
  status TEXT DEFAULT 'queued',
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, sync_key)
);

CREATE TABLE IF NOT EXISTS ads_api_sync_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  sync_key TEXT NOT NULL,
  platform TEXT DEFAULT 'meta_ads',
  campaign_name TEXT,
  status TEXT DEFAULT 'queued',
  spend_cents BIGINT DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, sync_key)
);

CREATE TABLE IF NOT EXISTS analytics_destination_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  destination TEXT DEFAULT 'analytics',
  event_name TEXT NOT NULL,
  delivery_status TEXT DEFAULT 'sent',
  payload JSONB DEFAULT '{}'::jsonb,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_key)
);

CREATE TABLE IF NOT EXISTS outbound_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  delivery_key TEXT NOT NULL,
  webhook_type TEXT NOT NULL,
  target_url TEXT,
  delivery_status TEXT DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, delivery_key)
);

CREATE TABLE IF NOT EXISTS financial_forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  forecast_key TEXT NOT NULL,
  forecast_period TEXT DEFAULT 'monthly',
  projected_revenue_cents BIGINT DEFAULT 0,
  projected_cost_cents BIGINT DEFAULT 0,
  projected_margin_cents BIGINT DEFAULT 0,
  confidence_score NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'generated',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, forecast_key)
);

CREATE TABLE IF NOT EXISTS inventory_demand_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  forecast_key TEXT NOT NULL,
  product_sku TEXT,
  demand_period TEXT DEFAULT 'monthly',
  projected_units INTEGER DEFAULT 0,
  reorder_recommendation TEXT,
  stockout_risk_score NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'generated',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, forecast_key)
);

CREATE TABLE IF NOT EXISTS unit_economics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  snapshot_key TEXT NOT NULL,
  aov_cents BIGINT DEFAULT 0,
  gross_margin_percent NUMERIC(10,2) DEFAULT 0,
  cac_cents BIGINT DEFAULT 0,
  ltv_cents BIGINT DEFAULT 0,
  payback_days INTEGER DEFAULT 0,
  contribution_margin_cents BIGINT DEFAULT 0,
  status TEXT DEFAULT 'generated',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE INDEX IF NOT EXISTS idx_ab_experiment_definitions_store_status ON ab_experiment_definitions(store_id, status);
CREATE INDEX IF NOT EXISTS idx_ab_experiment_variants_store_experiment ON ab_experiment_variants(store_id, experiment_key);
CREATE INDEX IF NOT EXISTS idx_conversion_learning_results_store_key ON conversion_learning_results(store_id, learning_key);
CREATE INDEX IF NOT EXISTS idx_external_integration_connections_store_type ON external_integration_connections(store_id, provider_type);
CREATE INDEX IF NOT EXISTS idx_financial_forecast_snapshots_store_period ON financial_forecast_snapshots(store_id, forecast_period);
CREATE INDEX IF NOT EXISTS idx_inventory_demand_forecasts_store_sku ON inventory_demand_forecasts(store_id, product_sku);
CREATE INDEX IF NOT EXISTS idx_unit_economics_snapshots_store_key ON unit_economics_snapshots(store_id, snapshot_key);

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN (
    'ab_experiment_definitions','ab_experiment_variants','conversion_learning_results','experiment_decision_records',
    'external_integration_connections','email_provider_sync_events','ads_api_sync_events','analytics_destination_events',
    'outbound_webhook_deliveries','financial_forecast_snapshots','inventory_demand_forecasts','unit_economics_snapshots')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', r.table_name, r.table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at_macro_final_a()', r.table_name, r.table_name);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
