-- ============================================================
-- POST-LAUNCH 18 — Enterprise Security, Audit Trails & Compliance Hardening
-- Selfcare Sinners Ecommerce
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS enterprise_security_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  area TEXT NOT NULL DEFAULT 'enterprise_security',
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  risk_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_action_trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_key TEXT NOT NULL,
  action_name TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'admin',
  entity_type TEXT,
  entity_id TEXT,
  before_state JSONB DEFAULT '{}'::jsonb,
  after_state JSONB DEFAULT '{}'::jsonb,
  approval_required BOOLEAN DEFAULT FALSE,
  approval_id UUID,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission_review_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  run_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  findings_count INTEGER DEFAULT 0,
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission_review_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES permission_review_runs(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role_name TEXT,
  permission_key TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_retention_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  job_key TEXT NOT NULL,
  data_domain TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 365,
  status TEXT NOT NULL DEFAULT 'pending',
  records_scanned INTEGER DEFAULT 0,
  records_marked INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  dry_run BOOLEAN DEFAULT TRUE,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  export_key TEXT NOT NULL,
  export_type TEXT NOT NULL DEFAULT 'audit',
  status TEXT NOT NULL DEFAULT 'requested',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  file_url TEXT,
  date_from TIMESTAMPTZ,
  date_to TIMESTAMPTZ,
  filters JSONB DEFAULT '{}'::jsonb,
  record_count INTEGER DEFAULT 0,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abuse_detection_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT DEFAULT 'system',
  ip_address TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email TEXT,
  risk_score INTEGER DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensitive_action_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  action_key TEXT NOT NULL,
  action_name TEXT NOT NULL,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  decision_notes TEXT,
  expires_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_hardening_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  check_name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'security',
  status TEXT NOT NULL DEFAULT 'pending',
  severity TEXT NOT NULL DEFAULT 'medium',
  recommendation TEXT,
  score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS compliance_operations_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  snapshot_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  audit_events_count INTEGER DEFAULT 0,
  admin_trails_count INTEGER DEFAULT 0,
  open_abuse_events INTEGER DEFAULT 0,
  pending_approvals INTEGER DEFAULT 0,
  pending_permission_reviews INTEGER DEFAULT 0,
  pending_retention_jobs INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE INDEX IF NOT EXISTS idx_enterprise_security_audit_events_store_created ON enterprise_security_audit_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_security_audit_events_severity ON enterprise_security_audit_events(severity);
CREATE INDEX IF NOT EXISTS idx_admin_action_trails_store_created ON admin_action_trails(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_trails_admin ON admin_action_trails(admin_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_permission_review_runs_store_run_key ON permission_review_runs(store_id, run_key);
CREATE INDEX IF NOT EXISTS idx_permission_review_items_run ON permission_review_items(run_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_data_retention_jobs_store_job_key ON data_retention_jobs(store_id, job_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_compliance_exports_store_export_key ON compliance_exports(store_id, export_key);
CREATE INDEX IF NOT EXISTS idx_abuse_detection_events_store_status ON abuse_detection_events(store_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sensitive_action_approvals_store_action_key ON sensitive_action_approvals(store_id, action_key);
CREATE INDEX IF NOT EXISTS idx_sensitive_action_approvals_status ON sensitive_action_approvals(status);
CREATE INDEX IF NOT EXISTS idx_security_hardening_checks_store_status ON security_hardening_checks(store_id, status);
CREATE INDEX IF NOT EXISTS idx_compliance_operations_snapshots_store_created ON compliance_operations_snapshots(store_id, created_at DESC);

INSERT INTO security_hardening_checks (store_id, check_key, check_name, area, status, severity, recommendation, score, passed, metadata)
SELECT s.id, item.check_key, item.check_name, item.area, item.status, item.severity, item.recommendation,
       CASE WHEN item.status = 'pass' THEN 100 ELSE 60 END,
       item.status = 'pass',
       jsonb_build_object('source','PL18 enterprise security baseline')
FROM stores s
CROSS JOIN (VALUES
  ('admin_mfa_readiness','Admin MFA readiness','identity','warning','high','Preparar MFA para administradores antes de escalar equipo.'),
  ('permission_review','Periodic permission review','access_control','pass','high','Ejecutar revisión periódica de permisos.'),
  ('audit_trails','Admin audit trails','audit','pass','high','Mantener trazabilidad de acciones admin.'),
  ('data_retention','Data retention policy','compliance','pass','medium','Revisar retención por dominio de datos.'),
  ('abuse_detection','Abuse detection controls','abuse','pass','medium','Mantener señales de abuso y resolución.'),
  ('sensitive_approvals','Sensitive action approvals','approval','pass','high','Requerir aprobación para acciones sensibles.'),
  ('compliance_exports','Compliance exports','exports','pass','medium','Mantener exportaciones auditables.')
) AS item(check_key, check_name, area, status, severity, recommendation)
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, check_key)
DO UPDATE SET
  check_name = EXCLUDED.check_name,
  area = EXCLUDED.area,
  status = EXCLUDED.status,
  severity = EXCLUDED.severity,
  recommendation = EXCLUDED.recommendation,
  score = EXCLUDED.score,
  passed = EXCLUDED.passed,
  updated_at = NOW();

INSERT INTO compliance_operations_snapshots (store_id, snapshot_key, status, score, metadata)
SELECT s.id, 'pl18-baseline', 'ready', 90, jsonb_build_object('source','PL18 baseline','enterpriseSecurity',true)
FROM stores s
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, snapshot_key)
DO UPDATE SET status = EXCLUDED.status, score = EXCLUDED.score, metadata = EXCLUDED.metadata, generated_at = NOW();

NOTIFY pgrst, 'reload schema';
