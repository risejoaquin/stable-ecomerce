-- POST-LAUNCH 29 — Operational Automation, Scheduled Reports & Alerting Workflows
-- Safe/idempotent migration for recurrent reports, scheduled reviews, commercial/technical alerts,
-- anomaly detection, revenue/conversion risk notifications, campaign/support/retention follow-ups and proactive operations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION pl29_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS scheduled_report_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  report_name TEXT NOT NULL DEFAULT 'Scheduled operating report',
  report_type TEXT NOT NULL DEFAULT 'executive_daily',
  cadence TEXT NOT NULL DEFAULT 'daily',
  audience TEXT NOT NULL DEFAULT 'executive',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE TABLE IF NOT EXISTS scheduled_report_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  run_key TEXT NOT NULL,
  report_key TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'executive_daily',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'generated',
  recipients_count INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, run_key)
);

CREATE TABLE IF NOT EXISTS recurring_review_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  schedule_key TEXT NOT NULL,
  review_name TEXT NOT NULL DEFAULT 'Operating review',
  review_type TEXT NOT NULL DEFAULT 'weekly_business_review',
  cadence TEXT NOT NULL DEFAULT 'weekly',
  owner_role TEXT NOT NULL DEFAULT 'admin',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  next_review_at TIMESTAMPTZ,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, schedule_key)
);

CREATE TABLE IF NOT EXISTS commercial_technical_alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  rule_name TEXT NOT NULL DEFAULT 'Commercial technical alert rule',
  alert_category TEXT NOT NULL DEFAULT 'commercial',
  metric_key TEXT NOT NULL DEFAULT 'conversion_rate',
  threshold_operator TEXT NOT NULL DEFAULT 'below',
  threshold_value NUMERIC(12,4) NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'medium',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, rule_key)
);

CREATE TABLE IF NOT EXISTS operational_anomaly_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  anomaly_key TEXT NOT NULL,
  anomaly_type TEXT NOT NULL DEFAULT 'conversion_drop',
  source_area TEXT NOT NULL DEFAULT 'commerce',
  severity TEXT NOT NULL DEFAULT 'medium',
  observed_value NUMERIC(12,4) NOT NULL DEFAULT 0,
  expected_value NUMERIC(12,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'detected',
  recommendation TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, anomaly_key)
);

CREATE TABLE IF NOT EXISTS revenue_conversion_risk_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  risk_type TEXT NOT NULL DEFAULT 'conversion_risk',
  channel TEXT NOT NULL DEFAULT 'all',
  severity TEXT NOT NULL DEFAULT 'medium',
  revenue_at_risk_cents INTEGER NOT NULL DEFAULT 0,
  conversion_delta NUMERIC(10,4) NOT NULL DEFAULT 0,
  notification_status TEXT NOT NULL DEFAULT 'queued',
  recommendation TEXT,
  notified_at TIMESTAMPTZ,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, notification_key)
);

CREATE TABLE IF NOT EXISTS campaign_followup_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  automation_key TEXT NOT NULL,
  campaign_name TEXT NOT NULL DEFAULT 'baseline_campaign',
  channel TEXT NOT NULL DEFAULT 'paid_social',
  trigger_type TEXT NOT NULL DEFAULT 'performance_threshold',
  status TEXT NOT NULL DEFAULT 'active',
  last_checked_at TIMESTAMPTZ,
  action_count INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, automation_key)
);

CREATE TABLE IF NOT EXISTS support_retention_followup_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  automation_key TEXT NOT NULL,
  workflow_type TEXT NOT NULL DEFAULT 'post_purchase_support',
  segment TEXT NOT NULL DEFAULT 'recent_buyers',
  trigger_type TEXT NOT NULL DEFAULT 'support_or_retention_signal',
  status TEXT NOT NULL DEFAULT 'active',
  pending_followups INTEGER NOT NULL DEFAULT 0,
  completed_followups INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, automation_key)
);

CREATE TABLE IF NOT EXISTS executive_workflow_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  workflow_key TEXT NOT NULL,
  workflow_name TEXT NOT NULL DEFAULT 'Executive recurring workflow',
  cadence TEXT NOT NULL DEFAULT 'weekly',
  owner_role TEXT NOT NULL DEFAULT 'executive',
  status TEXT NOT NULL DEFAULT 'active',
  open_actions INTEGER NOT NULL DEFAULT 0,
  completed_actions INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, workflow_key)
);

CREATE TABLE IF NOT EXISTS proactive_operations_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'proactive_operations',
  manual_work_reduction_score INTEGER NOT NULL DEFAULT 0,
  automation_coverage_score INTEGER NOT NULL DEFAULT 0,
  anomaly_detection_score INTEGER NOT NULL DEFAULT 0,
  alerting_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'generated',
  executive_summary TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_report_definitions_store ON scheduled_report_definitions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_report_runs_store ON scheduled_report_runs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_review_schedules_store ON recurring_review_schedules(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_technical_alert_rules_store ON commercial_technical_alert_rules(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_anomaly_events_store ON operational_anomaly_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_conversion_risk_notifications_store ON revenue_conversion_risk_notifications(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_followup_automations_store ON campaign_followup_automations(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_retention_followup_automations_store ON support_retention_followup_automations(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executive_workflow_automations_store ON executive_workflow_automations(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_operations_reports_store ON proactive_operations_reports(store_id, created_at DESC);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'scheduled_report_definitions',
    'scheduled_report_runs',
    'recurring_review_schedules',
    'commercial_technical_alert_rules',
    'operational_anomaly_events',
    'revenue_conversion_risk_notifications',
    'campaign_followup_automations',
    'support_retention_followup_automations',
    'executive_workflow_automations',
    'proactive_operations_reports'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION pl29_set_updated_at()', tbl, tbl);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
