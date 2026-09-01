-- POST-LAUNCH 27 — Customer Success, Retention Operations & Post-Purchase Experience
-- Safe/idempotent migration for post-purchase experience, satisfaction, support follow-up,
-- repeat purchase measurement, retention activation, post-purchase email optimization,
-- complaints/returns, NPS/CSAT and recurring customer conversion reporting.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION pl27_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS customer_success_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'monitoring',
  satisfaction_score INTEGER NOT NULL DEFAULT 0,
  open_support_cases INTEGER NOT NULL DEFAULT 0,
  repeat_purchase_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  retention_score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE TABLE IF NOT EXISTS post_purchase_experience_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  journey_stage TEXT NOT NULL DEFAULT 'post_purchase',
  status TEXT NOT NULL DEFAULT 'checked',
  score INTEGER NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS customer_satisfaction_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  measurement_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'post_purchase',
  csat_score NUMERIC(10,4) NOT NULL DEFAULT 0,
  nps_score INTEGER NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  detractor_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'measured',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, measurement_key)
);

CREATE TABLE IF NOT EXISTS support_followup_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  customer_email TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  support_area TEXT NOT NULL DEFAULT 'post_purchase',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, task_key)
);

CREATE TABLE IF NOT EXISTS repeat_purchase_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  measurement_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  first_time_buyers INTEGER NOT NULL DEFAULT 0,
  repeat_buyers INTEGER NOT NULL DEFAULT 0,
  repeat_purchase_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'measured',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, measurement_key)
);

CREATE TABLE IF NOT EXISTS retention_activation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  run_key TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'recent_buyers',
  campaign_name TEXT NOT NULL DEFAULT 'post_purchase_retention',
  status TEXT NOT NULL DEFAULT 'planned',
  target_customers INTEGER NOT NULL DEFAULT 0,
  activated_customers INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, run_key)
);

CREATE TABLE IF NOT EXISTS post_purchase_email_optimizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  optimization_key TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'post_purchase',
  subject_line TEXT,
  open_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  click_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'optimized',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, optimization_key)
);

CREATE TABLE IF NOT EXISTS complaints_returns_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  case_key TEXT NOT NULL,
  customer_email TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  case_type TEXT NOT NULL DEFAULT 'complaint',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, case_key)
);

CREATE TABLE IF NOT EXISTS nps_csat_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  survey_key TEXT NOT NULL,
  survey_type TEXT NOT NULL DEFAULT 'nps_csat',
  nps_score INTEGER NOT NULL DEFAULT 0,
  csat_score NUMERIC(10,4) NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, survey_key)
);

CREATE TABLE IF NOT EXISTS recurring_customer_conversion_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  returning_customers INTEGER NOT NULL DEFAULT 0,
  recurring_revenue_cents INTEGER NOT NULL DEFAULT 0,
  lifecycle_stage TEXT NOT NULL DEFAULT 'retention',
  score INTEGER NOT NULL DEFAULT 0,
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
    'customer_success_snapshots','post_purchase_experience_checks','customer_satisfaction_measurements',
    'support_followup_tasks','repeat_purchase_measurements','retention_activation_runs',
    'post_purchase_email_optimizations','complaints_returns_cases','nps_csat_surveys',
    'recurring_customer_conversion_reports'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION pl27_set_updated_at()', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_success_snapshots_store_created ON customer_success_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_purchase_experience_checks_store_status ON post_purchase_experience_checks(store_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_measurements_store_created ON customer_satisfaction_measurements(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_followup_tasks_store_status_priority ON support_followup_tasks(store_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_repeat_purchase_measurements_store_period ON repeat_purchase_measurements(store_id, period);
CREATE INDEX IF NOT EXISTS idx_retention_activation_runs_store_status ON retention_activation_runs(store_id, status);
CREATE INDEX IF NOT EXISTS idx_post_purchase_email_optimizations_store_type ON post_purchase_email_optimizations(store_id, email_type);
CREATE INDEX IF NOT EXISTS idx_complaints_returns_cases_store_status ON complaints_returns_cases(store_id, status);
CREATE INDEX IF NOT EXISTS idx_nps_csat_surveys_store_type ON nps_csat_surveys(store_id, survey_type);
CREATE INDEX IF NOT EXISTS idx_recurring_customer_conversion_reports_store_period ON recurring_customer_conversion_reports(store_id, period);

INSERT INTO customer_success_snapshots (store_id, snapshot_key, status, satisfaction_score, open_support_cases, repeat_purchase_rate, retention_score, recommendation, metadata)
SELECT s.id, 'pl27-baseline-customer-success', 'monitoring', 88, 0, 18.5, 86,
       'Operate post-purchase support, satisfaction and retention as a recurring customer success loop.',
       '{"source":"pl27_seed"}'::jsonb
FROM stores s
ORDER BY s.created_at ASC
LIMIT 1
ON CONFLICT (store_id, snapshot_key) DO NOTHING;

INSERT INTO post_purchase_experience_checks (store_id, check_key, journey_stage, status, score, issue_count, recommendation, metadata)
SELECT s.id, 'pl27-baseline-post-purchase', 'order_delivered_followup', 'checked', 90, 0,
       'Validate confirmation, tracking, delivery follow-up, support CTA and reorder path after purchase.',
       '{"source":"pl27_seed"}'::jsonb
FROM stores s
ORDER BY s.created_at ASC
LIMIT 1
ON CONFLICT (store_id, check_key) DO NOTHING;

INSERT INTO nps_csat_surveys (store_id, survey_key, survey_type, nps_score, csat_score, response_count, status, recommendation, metadata)
SELECT s.id, 'pl27-baseline-nps-csat', 'post_purchase', 52, 4.6, 12, 'active',
       'Collect NPS/CSAT after delivery and route detractors into support follow-up.',
       '{"source":"pl27_seed"}'::jsonb
FROM stores s
ORDER BY s.created_at ASC
LIMIT 1
ON CONFLICT (store_id, survey_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
