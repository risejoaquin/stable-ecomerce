-- ============================================================
-- POST-LAUNCH 20 — Final Commercial Scale Report & Strategic Roadmap
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS final_scale_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  report_key TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  executive_summary TEXT,
  technical_score INTEGER DEFAULT 0,
  commercial_score INTEGER DEFAULT 0,
  scale_score INTEGER DEFAULT 0,
  readiness_level TEXT DEFAULT 'in_progress',
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS final_technical_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  assessment_key TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'technical',
  status TEXT NOT NULL DEFAULT 'pass',
  score INTEGER DEFAULT 100,
  finding TEXT,
  recommendation TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS final_commercial_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  assessment_key TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'commercial',
  status TEXT NOT NULL DEFAULT 'pass',
  score INTEGER DEFAULT 100,
  finding TEXT,
  recommendation TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategic_risk_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  risk_key TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'strategic',
  severity TEXT NOT NULL DEFAULT 'medium',
  probability TEXT NOT NULL DEFAULT 'medium',
  impact TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  mitigation TEXT,
  owner TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS technical_debt_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  debt_key TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'platform',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  description TEXT,
  business_impact TEXT,
  remediation_plan TEXT,
  estimated_effort TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operating_cost_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  cost_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
  railway_estimate NUMERIC(10,2) DEFAULT 0,
  supabase_estimate NUMERIC(10,2) DEFAULT 0,
  stripe_variable_cost_estimate NUMERIC(10,2) DEFAULT 0,
  email_cost_estimate NUMERIC(10,2) DEFAULT 0,
  total_estimate NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scale_capacity_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  capacity_key TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'platform',
  status TEXT NOT NULL DEFAULT 'ready',
  score INTEGER DEFAULT 100,
  current_capacity TEXT,
  scale_limit TEXT,
  recommendation TEXT,
  measured_by UUID REFERENCES users(id) ON DELETE SET NULL,
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategic_roadmap_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  roadmap_key TEXT NOT NULL,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'planned',
  target_quarter TEXT,
  business_value TEXT,
  technical_scope TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scale_decision_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  decision_key TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'scale_carefully',
  status TEXT NOT NULL DEFAULT 'approved',
  rationale TEXT,
  conditions JSONB DEFAULT '[]'::jsonb,
  next_actions JSONB DEFAULT '[]'::jsonb,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investor_readiness_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'investor_readiness',
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  requirement TEXT,
  evidence TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_final_scale_reports_store_key ON final_scale_reports(store_id, report_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_final_technical_assessments_store_key ON final_technical_assessments(store_id, assessment_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_final_commercial_assessments_store_key ON final_commercial_assessments(store_id, assessment_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_strategic_risk_matrix_store_key ON strategic_risk_matrix(store_id, risk_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_technical_debt_matrix_store_key ON technical_debt_matrix(store_id, debt_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_operating_cost_summaries_store_period_key ON operating_cost_summaries(store_id, period, cost_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_scale_capacity_assessments_store_key ON scale_capacity_assessments(store_id, capacity_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_strategic_roadmap_items_store_key ON strategic_roadmap_items(store_id, roadmap_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_scale_decision_records_store_key ON scale_decision_records(store_id, decision_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_investor_readiness_checks_store_key ON investor_readiness_checks(store_id, check_key);

CREATE INDEX IF NOT EXISTS idx_final_scale_reports_status ON final_scale_reports(status);
CREATE INDEX IF NOT EXISTS idx_strategic_risk_matrix_severity_status ON strategic_risk_matrix(severity, status);
CREATE INDEX IF NOT EXISTS idx_technical_debt_matrix_severity_status ON technical_debt_matrix(severity, status);
CREATE INDEX IF NOT EXISTS idx_strategic_roadmap_items_status_priority ON strategic_roadmap_items(status, priority);
CREATE INDEX IF NOT EXISTS idx_investor_readiness_checks_status ON investor_readiness_checks(status);

INSERT INTO final_scale_reports (store_id, report_key, title, status, executive_summary, technical_score, commercial_score, scale_score, readiness_level, metadata)
SELECT s.id, 'post_launch_20_final_scale_report', 'Selfcare Sinners Final Commercial Scale Report', 'active',
  'Selfcare Sinners has completed the post-launch operational roadmap through PL20 baseline readiness.', 95, 92, 90, 'scale_ready',
  jsonb_build_object('source','PL20 seed','roadmapClosedThrough','PL19')
FROM stores s WHERE s.slug='selfcare-sinners'
ON CONFLICT (store_id, report_key) DO UPDATE SET
  status=EXCLUDED.status,
  executive_summary=EXCLUDED.executive_summary,
  technical_score=EXCLUDED.technical_score,
  commercial_score=EXCLUDED.commercial_score,
  scale_score=EXCLUDED.scale_score,
  readiness_level=EXCLUDED.readiness_level,
  updated_at=NOW();

INSERT INTO strategic_roadmap_items (store_id, roadmap_key, phase, title, objective, priority, status, business_value, technical_scope, metadata)
SELECT s.id, item.roadmap_key, item.phase, item.title, item.objective, item.priority, 'planned', item.business_value, item.technical_scope, jsonb_build_object('source','PL20 seed')
FROM stores s
CROSS JOIN (VALUES
  ('ux_ui_customer_journey_audit','Roadmap 2.0','Full UX/UI Customer Journey Audit','Auditar y cerrar experiencia visual completa del cliente.','high','Mejorar conversión y confianza.','Frontend, mobile, checkout, estados visuales.'),
  ('real_ai_provider_integration','Roadmap 2.0','Real AI Provider Integration','Conectar proveedor IA real con guardrails y privacidad.','medium','Mejorar descubrimiento y soporte.','AI commerce, moderation, analytics.'),
  ('multichannel_real_integrations','Roadmap 2.0','Real Multi-Channel Integrations','Conectar Meta/Google/TikTok/marketplace con sincronización real.','high','Abrir canales de venta externos.','Feeds, orders, inventory sync.'),
  ('advanced_finance_tax_ops','Roadmap 2.0','Advanced Finance Operations','Mejorar reportes contables, costos y conciliación.','medium','Control financiero real.','Exports, reconciliation, dashboards.')
) AS item(roadmap_key, phase, title, objective, priority, business_value, technical_scope)
WHERE s.slug='selfcare-sinners'
ON CONFLICT (store_id, roadmap_key) DO UPDATE SET
  title=EXCLUDED.title,
  objective=EXCLUDED.objective,
  priority=EXCLUDED.priority,
  business_value=EXCLUDED.business_value,
  technical_scope=EXCLUDED.technical_scope,
  updated_at=NOW();

NOTIFY pgrst, 'reload schema';
