-- POST-LAUNCH 11 — Scale, Multi-Operator Workflows & Advanced Admin UX
-- Selfcare Sinners / SolidBit Standard

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE operational_events
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, role_key)
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permission_key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL,
  display_name TEXT,
  status TEXT DEFAULT 'active',
  workload_capacity INTEGER DEFAULT 25,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

CREATE TABLE IF NOT EXISTS admin_work_queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  queue_type TEXT NOT NULL DEFAULT 'operations',
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'normal',
  owner_role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_work_queue_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES admin_work_queues(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  task_type TEXT NOT NULL DEFAULT 'follow_up',
  title TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL DEFAULT 'internal',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_bulk_action_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'queued',
  target_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_dashboard_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  view_key TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT DEFAULT 'operations',
  layout JSONB DEFAULT '{}'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, view_key)
);

CREATE TABLE IF NOT EXISTS advanced_admin_audit_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_store_key ON admin_roles(store_id, role_key);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_module_action ON admin_permissions(module, action);
CREATE INDEX IF NOT EXISTS idx_admin_team_members_store_status ON admin_team_members(store_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_work_queues_store_status ON admin_work_queues(store_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_admin_work_queue_items_queue_status ON admin_work_queue_items(queue_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_admin_work_queue_items_assigned ON admin_work_queue_items(assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS idx_admin_assignments_assigned_status ON admin_assignments(assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_recipient_read ON admin_notifications(recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_bulk_action_runs_store_created ON admin_bulk_action_runs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advanced_admin_audit_actor_created ON advanced_admin_audit_entries(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advanced_admin_audit_entity ON advanced_admin_audit_entries(entity_type, entity_id);

WITH store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
)
INSERT INTO admin_permissions(permission_key, module, action, description)
VALUES
  ('orders.read', 'orders', 'read', 'Leer pedidos y detalles operativos.'),
  ('orders.update', 'orders', 'update', 'Actualizar estados, tracking y fulfillment.'),
  ('support.manage', 'support', 'manage', 'Gestionar tickets, SLA y respuestas.'),
  ('catalog.manage', 'catalog', 'manage', 'Gestionar catálogo, media y merchandising.'),
  ('finance.read', 'finance', 'read', 'Leer reportes financieros y conciliación.'),
  ('governance.read', 'governance', 'read', 'Leer governance, riesgos y checklist mensual.'),
  ('admin.bulk_actions', 'admin', 'bulk_actions', 'Ejecutar acciones masivas administrativas.'),
  ('admin.assignments', 'admin', 'assignments', 'Crear y asignar tareas operativas.')
ON CONFLICT(permission_key) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = TRUE;

WITH store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
)
INSERT INTO admin_roles(store_id, role_key, name, description, is_system)
SELECT id, role_key, name, description, TRUE
FROM store
CROSS JOIN (VALUES
  ('owner', 'Owner', 'Acceso completo de propietario.'),
  ('operations_manager', 'Operations Manager', 'Gestiona pedidos, fulfillment, soporte y reporting operativo.'),
  ('support_agent', 'Support Agent', 'Gestiona tickets, mensajes y seguimiento de cliente.'),
  ('catalog_manager', 'Catalog Manager', 'Gestiona catálogo, media, merchandising y readiness de producto.'),
  ('finance_viewer', 'Finance Viewer', 'Acceso de lectura a reportes financieros y conciliación.')
) AS r(role_key, name, description)
ON CONFLICT(store_id, role_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

WITH store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
)
INSERT INTO admin_work_queues(store_id, name, queue_type, status, priority, metadata)
SELECT id, name, queue_type, 'active', priority, jsonb_build_object('source','PL11 migration')
FROM store
CROSS JOIN (VALUES
  ('Pedidos listos para enviar', 'fulfillment', 'high'),
  ('Tickets de soporte abiertos', 'support', 'high'),
  ('Catálogo pendiente de publicación', 'catalog', 'normal'),
  ('Revisión financiera diaria', 'finance', 'normal')
) AS q(name, queue_type, priority)
WHERE NOT EXISTS (
  SELECT 1 FROM admin_work_queues existing
  WHERE existing.store_id = store.id AND existing.name = q.name
);

WITH store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
)
INSERT INTO admin_dashboard_views(store_id, view_key, name, team, is_default, layout, filters)
SELECT id, view_key, name, team, is_default, layout::jsonb, filters::jsonb
FROM store
CROSS JOIN (VALUES
  ('owner_ops', 'Owner Operations Overview', 'owner', TRUE, '{"cards":["revenue","orders","support","catalog","risk"]}', '{}'),
  ('fulfillment_team', 'Fulfillment Team View', 'operations', FALSE, '{"cards":["ready_to_ship","late_orders","assignments"]}', '{"team":"fulfillment"}'),
  ('support_team', 'Support Team View', 'support', FALSE, '{"cards":["tickets","sla","templates","customer_history"]}', '{"team":"support"}'),
  ('catalog_team', 'Catalog Team View', 'catalog', FALSE, '{"cards":["catalog_qa","media","product_readiness","paid_feed"]}', '{"team":"catalog"}')
) AS v(view_key, name, team, is_default, layout, filters)
ON CONFLICT(store_id, view_key) DO UPDATE SET
  name = EXCLUDED.name,
  team = EXCLUDED.team,
  layout = EXCLUDED.layout,
  filters = EXCLUDED.filters,
  updated_at = NOW();

INSERT INTO operational_events(store_id, event_type, severity, message, metadata)
SELECT id, 'post_launch_11_migration_applied', 'info', 'POST-LAUNCH 11 scale, multi-operator workflows and advanced admin UX migration applied.', jsonb_build_object('phase','PL11')
FROM stores
WHERE slug = 'selfcare-sinners';

NOTIFY pgrst, 'reload schema';
