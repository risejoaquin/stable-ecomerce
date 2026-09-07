
-- POST-LAUNCH 21 — Full UX/UI Customer Journey Completion & Frontend Product Polish
-- Adds operational UX/UI audit tables used to validate customer journey, admin UX,
-- mobile-first polish, checkout confidence, accessibility and conversion trust.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ux_ui_audit_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  run_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  scope TEXT DEFAULT 'full_customer_admin_journey',
  summary TEXT,
  findings JSONB DEFAULT '{}'::jsonb,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, run_key)
);

CREATE TABLE IF NOT EXISTS ux_ui_audit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  run_key TEXT,
  item_key TEXT NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, item_key)
);

CREATE TABLE IF NOT EXISTS customer_journey_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  journey_key TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, journey_key)
);

CREATE TABLE IF NOT EXISTS admin_ux_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  module TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS frontend_polish_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  area TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  recommendation TEXT,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, task_key)
);

CREATE TABLE IF NOT EXISTS mobile_ux_validation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  device_type TEXT DEFAULT 'mobile',
  viewport TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_key)
);

CREATE TABLE IF NOT EXISTS checkout_ux_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS conversion_trust_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS accessibility_validation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  validation_key TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, validation_key)
);

CREATE TABLE IF NOT EXISTS visual_regression_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  page_path TEXT NOT NULL,
  viewport TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'baseline',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  captured_by UUID REFERENCES users(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, snapshot_key)
);

CREATE INDEX IF NOT EXISTS idx_ux_ui_audit_runs_store_created ON ux_ui_audit_runs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ux_ui_audit_items_store_area ON ux_ui_audit_items(store_id, area, status);
CREATE INDEX IF NOT EXISTS idx_customer_journey_checks_store_step ON customer_journey_checks(store_id, step, status);
CREATE INDEX IF NOT EXISTS idx_admin_ux_checks_store_module ON admin_ux_checks(store_id, module, status);
CREATE INDEX IF NOT EXISTS idx_frontend_polish_tasks_store_area ON frontend_polish_tasks(store_id, area, status);
CREATE INDEX IF NOT EXISTS idx_mobile_ux_validation_events_store_device ON mobile_ux_validation_events(store_id, device_type, status);
CREATE INDEX IF NOT EXISTS idx_checkout_ux_checks_store_step ON checkout_ux_checks(store_id, step, status);
CREATE INDEX IF NOT EXISTS idx_conversion_trust_checks_store_area ON conversion_trust_checks(store_id, area, status);
CREATE INDEX IF NOT EXISTS idx_accessibility_validation_items_store_category ON accessibility_validation_items(store_id, category, status);
CREATE INDEX IF NOT EXISTS idx_visual_regression_snapshots_store_page ON visual_regression_snapshots(store_id, page_path, viewport);

NOTIFY pgrst, 'reload schema';
