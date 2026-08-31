-- POST-LAUNCH 10 — Production Governance, Security Audit & Scale Readiness
-- Idempotent migration for governance, security audit, monthly operations, backup/restore and scale readiness.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE operational_events
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operational_events_store_created_at
ON operational_events(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS governance_audit_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  scope TEXT NOT NULL DEFAULT 'production_governance',
  summary TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_audit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_run_id UUID REFERENCES governance_audit_runs(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pass',
  severity TEXT NOT NULL DEFAULT 'info',
  evidence TEXT,
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_access_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  policy_name TEXT NOT NULL,
  description TEXT,
  required_role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limit_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  route_pattern TEXT NOT NULL,
  window_seconds INTEGER NOT NULL DEFAULT 900,
  max_requests INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_review_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  area TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'open',
  mitigation TEXT,
  due_date DATE,
  owner TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_restore_drills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  drill_type TEXT NOT NULL DEFAULT 'backup_restore_readiness',
  status TEXT NOT NULL DEFAULT 'planned',
  backup_reference TEXT,
  restore_target TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  log_source TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scale_readiness_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  threshold TEXT,
  current_value TEXT,
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_operations_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_operations_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID REFERENCES monthly_operations_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governance_audit_runs_created_at ON governance_audit_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_audit_items_run ON governance_audit_items(audit_run_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_access_policies_store ON admin_access_policies(store_id, status);
CREATE INDEX IF NOT EXISTS idx_rate_limit_policies_route ON rate_limit_policies(route_pattern, status);
CREATE INDEX IF NOT EXISTS idx_security_review_findings_status ON security_review_findings(status, severity);
CREATE INDEX IF NOT EXISTS idx_backup_restore_drills_created_at ON backup_restore_drills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_retention_policies_source ON log_retention_policies(log_source, status);
CREATE INDEX IF NOT EXISTS idx_scale_readiness_checks_platform ON scale_readiness_checks(platform, status);
CREATE INDEX IF NOT EXISTS idx_monthly_operations_checklists_period ON monthly_operations_checklists(period, status);
CREATE INDEX IF NOT EXISTS idx_monthly_operations_checklist_items_checklist ON monthly_operations_checklist_items(checklist_id, sort_order);

WITH primary_store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
), audit_run AS (
  INSERT INTO governance_audit_runs(store_id, status, scope, summary, metadata)
  SELECT id, 'completed', 'post_launch_10', 'Production governance, security and scale readiness baseline applied.', '{"source":"016_post_launch_10"}'::jsonb
  FROM primary_store
  WHERE NOT EXISTS (SELECT 1 FROM governance_audit_runs WHERE scope = 'post_launch_10')
  RETURNING id, store_id
)
INSERT INTO governance_audit_items(audit_run_id, area, check_name, status, severity, evidence, recommendation)
SELECT ar.id, x.area, x.check_name, x.status, x.severity, x.evidence, x.recommendation
FROM audit_run ar
CROSS JOIN (VALUES
  ('security','JWT configured','pass','info','Admin smoke tests require Bearer token.','Rotate secrets periodically.'),
  ('security','CSP enabled','pass','info','Helmet/CSP and service worker policy validated.','Review CSP after adding new third-party pixels.'),
  ('payments','Stripe webhook monitoring','pass','info','Diagnostics show unresolvedStripeEvents=0.','Review after every campaign launch.'),
  ('operations','Health/readiness','pass','info','Smoke tests pass health and readiness.','Keep daily checks during paid traffic.'),
  ('scale','Railway/Supabase readiness','ready','medium','Baseline scale readiness tables created.','Define thresholds before high ad spend.')
) AS x(area, check_name, status, severity, evidence, recommendation);

INSERT INTO admin_access_policies(store_id, policy_name, description, required_role, status)
SELECT id, 'Admin routes require JWT admin role', 'All /api/admin routes require valid Bearer token and admin role.', 'admin', 'active'
FROM stores WHERE slug = 'selfcare-sinners'
ON CONFLICT DO NOTHING;

INSERT INTO rate_limit_policies(store_id, route_pattern, window_seconds, max_requests, status, metadata)
SELECT id, route_pattern, window_seconds, max_requests, 'active', '{"source":"016_post_launch_10"}'::jsonb
FROM stores
CROSS JOIN (VALUES
  ('/api/login', 900, 20),
  ('/api/checkout', 900, 60),
  ('/api/webhooks/stripe', 900, 600),
  ('/api/admin/*', 900, 300),
  ('/api/analytics/*', 900, 1000)
) AS x(route_pattern, window_seconds, max_requests)
WHERE slug = 'selfcare-sinners'
ON CONFLICT DO NOTHING;

INSERT INTO log_retention_policies(store_id, log_source, retention_days, status)
SELECT id, log_source, retention_days, 'active'
FROM stores
CROSS JOIN (VALUES
  ('railway_runtime_logs', 30),
  ('operational_events', 180),
  ('stripe_events', 365),
  ('audit_logs', 365),
  ('support_tickets', 730)
) AS x(log_source, retention_days)
WHERE slug = 'selfcare-sinners'
ON CONFLICT DO NOTHING;

INSERT INTO scale_readiness_checks(store_id, platform, check_name, status, threshold, recommendation)
SELECT id, platform, check_name, status, threshold, recommendation
FROM stores
CROSS JOIN (VALUES
  ('Railway', 'Monitor CPU/RAM/restarts', 'ready', 'No repeated crashes, no sustained saturation', 'Increase plan/resources before paid traffic spikes.'),
  ('Supabase', 'Monitor DB latency/connections/storage', 'ready', 'Readiness latency stable and no connection pressure', 'Add indexes before catalog and analytics growth.'),
  ('Stripe', 'Monitor webhook unresolved events', 'ready', 'unresolvedStripeEvents = 0', 'Alert on any failed checkout.session.completed.'),
  ('Frontend', 'Monitor CSP/service worker errors', 'ready', 'No console-blocking errors', 'Revalidate after adding pixels/scripts.')
) AS x(platform, check_name, status, threshold, recommendation)
WHERE slug = 'selfcare-sinners'
ON CONFLICT DO NOTHING;

INSERT INTO security_review_findings(store_id, area, title, severity, status, mitigation, owner)
SELECT id, 'governance', 'Monthly backup/restore drill must be executed and evidenced', 'medium', 'open', 'Run monthly backup/restore checklist and attach evidence in operations notes.', 'admin'
FROM stores WHERE slug = 'selfcare-sinners'
  AND NOT EXISTS (SELECT 1 FROM security_review_findings WHERE title = 'Monthly backup/restore drill must be executed and evidenced');

INSERT INTO operational_events(store_id, event_type, severity, message, metadata)
SELECT id, 'post_launch_10_governance_applied', 'info', 'POST-LAUNCH 10 governance, security and scale readiness migration applied.', '{"source":"016_post_launch_10"}'::jsonb
FROM stores WHERE slug = 'selfcare-sinners'
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
