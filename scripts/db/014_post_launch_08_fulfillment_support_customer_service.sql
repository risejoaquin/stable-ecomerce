-- POST-LAUNCH 08 — Fulfillment, Support Operations & Customer Service Hardening
-- Safe, idempotent migration for production fulfillment/customer service workflows.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS fulfillment_priority INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS fulfillment_notes TEXT,
  ADD COLUMN IF NOT EXISTS support_status TEXT DEFAULT 'none';

CREATE TABLE IF NOT EXISTS fulfillment_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  batch_number TEXT,
  status TEXT DEFAULT 'open',
  carrier TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fulfillment_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES fulfillment_batches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'ready',
  priority INTEGER DEFAULT 100,
  due_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_email TEXT,
  subject TEXT NOT NULL DEFAULT 'Customer support request',
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  channel TEXT DEFAULT 'web',
  category TEXT DEFAULT 'general',
  sla_due_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  direction TEXT DEFAULT 'inbound',
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  response_minutes INTEGER DEFAULT 1440,
  resolution_minutes INTEGER DEFAULT 4320,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_response_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 100,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  incident_type TEXT DEFAULT 'order_issue',
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  description TEXT,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS returns_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_email TEXT,
  reason TEXT DEFAULT 'customer_request',
  status TEXT DEFAULT 'requested',
  requested_amount NUMERIC(10,2),
  approved_amount NUMERIC(10,2),
  resolution TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_service_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  customer_email TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  visibility TEXT DEFAULT 'internal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status_updated_at ON orders(fulfillment_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_updated_at_pl08 ON orders(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fulfillment_queue_store_status_due ON fulfillment_queue(store_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_fulfillment_queue_order ON fulfillment_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_store_status_updated ON support_tickets(store_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_created ON support_ticket_messages(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_sla_store_active ON support_sla_policies(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_support_templates_store_active ON support_response_templates(store_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_order_incidents_store_status ON order_incidents(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_requests_store_status ON returns_requests(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_service_notes_customer_created ON customer_service_notes(customer_email, created_at DESC);

INSERT INTO support_sla_policies(store_id, name, priority, response_minutes, resolution_minutes, is_active, metadata)
SELECT s.id, 'Standard customer support SLA', 'normal', 1440, 4320, TRUE, jsonb_build_object('source', '014_post_launch_08')
FROM stores s
WHERE s.slug = 'selfcare-sinners'
  AND NOT EXISTS (
    SELECT 1 FROM support_sla_policies p WHERE p.store_id = s.id AND p.name = 'Standard customer support SLA'
  );

INSERT INTO support_response_templates(store_id, title, category, body, is_active, sort_order, metadata)
SELECT s.id, 'Confirmación de seguimiento', 'tracking', 'Hola, gracias por escribirnos. Tu pedido ya está en revisión y te compartiremos el seguimiento actualizado lo antes posible.', TRUE, 10, jsonb_build_object('source', '014_post_launch_08')
FROM stores s
WHERE s.slug = 'selfcare-sinners'
  AND NOT EXISTS (
    SELECT 1 FROM support_response_templates t WHERE t.store_id = s.id AND t.title = 'Confirmación de seguimiento'
  );

INSERT INTO support_response_templates(store_id, title, category, body, is_active, sort_order, metadata)
SELECT s.id, 'Solicitud de cambio o devolución', 'returns', 'Hola, recibimos tu solicitud. Revisaremos el pedido y te indicaremos los siguientes pasos para cambios o devoluciones.', TRUE, 20, jsonb_build_object('source', '014_post_launch_08')
FROM stores s
WHERE s.slug = 'selfcare-sinners'
  AND NOT EXISTS (
    SELECT 1 FROM support_response_templates t WHERE t.store_id = s.id AND t.title = 'Solicitud de cambio o devolución'
  );

INSERT INTO operational_events(store_id, event_type, severity, message, metadata)
SELECT s.id, 'post_launch_08_migration_applied', 'info', 'POST-LAUNCH 08 fulfillment and customer service migration applied.', jsonb_build_object('phase', 'PL08')
FROM stores s
WHERE s.slug = 'selfcare-sinners'
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operational_events' AND column_name = 'store_id');

NOTIFY pgrst, 'reload schema';
