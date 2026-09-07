-- ============================================================
-- POST-LAUNCH 17 — Advanced Automation, CRM & Lifecycle Marketing
-- Selfcare Sinners Ecommerce
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CRM contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  lifecycle_stage TEXT NOT NULL DEFAULT 'lead',
  marketing_status TEXT NOT NULL DEFAULT 'subscribed',
  consent_email BOOLEAN DEFAULT TRUE,
  consent_sms BOOLEAN DEFAULT FALSE,
  consent_push BOOLEAN DEFAULT FALSE,
  total_orders INTEGER DEFAULT 0,
  lifetime_value NUMERIC(12,2) DEFAULT 0,
  average_order_value NUMERIC(12,2) DEFAULT 0,
  last_order_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  next_best_action TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_store_stage ON crm_contacts(store_id, lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_store_marketing ON crm_contacts(store_id, marketing_status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_updated_at ON crm_contacts(updated_at DESC);

-- ============================================================
-- CRM segments
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  segment_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB DEFAULT '{}'::jsonb,
  customer_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, segment_key)
);

CREATE INDEX IF NOT EXISTS idx_crm_segments_store_active ON crm_segments(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_segments_segment_key ON crm_segments(segment_key);

-- ============================================================
-- Lifecycle journeys and steps
-- ============================================================
CREATE TABLE IF NOT EXISTS lifecycle_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  journey_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  journey_type TEXT NOT NULL DEFAULT 'lifecycle',
  status TEXT NOT NULL DEFAULT 'draft',
  is_active BOOLEAN DEFAULT FALSE,
  entry_criteria JSONB DEFAULT '{}'::jsonb,
  exit_criteria JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, journey_key)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_journeys_store_status ON lifecycle_journeys(store_id, status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_journeys_store_type ON lifecycle_journeys(store_id, journey_type);

CREATE TABLE IF NOT EXISTS journey_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES lifecycle_journeys(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  action_type TEXT NOT NULL DEFAULT 'send_message',
  delay_minutes INTEGER DEFAULT 0,
  template_key TEXT,
  conditions JSONB DEFAULT '{}'::jsonb,
  payload JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(journey_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_journey_steps_journey_order ON journey_steps(journey_id, step_order);
CREATE INDEX IF NOT EXISTS idx_journey_steps_store_channel ON journey_steps(store_id, channel);

-- ============================================================
-- Automation triggers and executions
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'behavioral',
  event_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  throttle_minutes INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, trigger_key)
);

CREATE INDEX IF NOT EXISTS idx_automation_triggers_store_active ON automation_triggers(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_triggers_event_name ON automation_triggers(event_name);

CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES automation_triggers(id) ON DELETE SET NULL,
  trigger_key TEXT,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  journey_id UUID REFERENCES lifecycle_journeys(id) ON DELETE SET NULL,
  execution_type TEXT NOT NULL DEFAULT 'manual_run',
  status TEXT NOT NULL DEFAULT 'pending',
  target_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_executions_store_status ON automation_executions(store_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_trigger_key ON automation_executions(trigger_key);
CREATE INDEX IF NOT EXISTS idx_automation_executions_created_at ON automation_executions(created_at DESC);

-- ============================================================
-- Customer touchpoints
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_touchpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  customer_email TEXT,
  touchpoint_type TEXT NOT NULL DEFAULT 'lifecycle',
  channel TEXT NOT NULL DEFAULT 'email',
  direction TEXT DEFAULT 'outbound',
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'logged',
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  journey_id UUID REFERENCES lifecycle_journeys(id) ON DELETE SET NULL,
  campaign_key TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_touchpoints_store_created ON customer_touchpoints(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_touchpoints_email ON customer_touchpoints(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_touchpoints_channel ON customer_touchpoints(channel);

-- ============================================================
-- Campaign orchestration events
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_orchestration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  campaign_key TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'lifecycle_marketing',
  segment_key TEXT,
  channels JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  revenue_attributed NUMERIC(12,2) DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, campaign_key)
);

CREATE INDEX IF NOT EXISTS idx_campaign_orchestration_store_status ON campaign_orchestration_events(store_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_orchestration_campaign_key ON campaign_orchestration_events(campaign_key);
CREATE INDEX IF NOT EXISTS idx_campaign_orchestration_scheduled ON campaign_orchestration_events(scheduled_at DESC);

-- ============================================================
-- Seed baseline for Selfcare Sinners
-- ============================================================
INSERT INTO crm_segments (store_id, segment_key, name, description, criteria, customer_count, is_active, metadata)
SELECT
  s.id,
  item.segment_key,
  item.name,
  item.description,
  item.criteria::jsonb,
  0,
  TRUE,
  jsonb_build_object('source', 'PL17 baseline seed')
FROM stores s
CROSS JOIN (
  VALUES
    ('high_intent_customers', 'Clientes de alta intención', 'Clientes con señales recientes de compra.', '{"intent":"high","recent_activity":true}'),
    ('abandoned_cart', 'Carritos abandonados', 'Clientes con carrito abandonado para recuperación.', '{"event":"cart_abandoned"}'),
    ('post_purchase', 'Post-compra', 'Clientes recientes para seguimiento y recompra.', '{"event":"order_paid"}'),
    ('rebuy_ready', 'Listos para recompra', 'Clientes con ventana de recompra activa.', '{"days_since_last_order":{"gte":20}}')
) AS item(segment_key, name, description, criteria)
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, segment_key)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO lifecycle_journeys (store_id, journey_key, name, description, journey_type, status, is_active, entry_criteria, exit_criteria, metadata)
SELECT
  s.id,
  item.journey_key,
  item.name,
  item.description,
  item.journey_type,
  'active',
  TRUE,
  item.entry_criteria::jsonb,
  item.exit_criteria::jsonb,
  jsonb_build_object('source', 'PL17 baseline seed')
FROM stores s
CROSS JOIN (
  VALUES
    ('abandoned_cart_recovery', 'Recuperación avanzada de carrito', 'Journey para recuperar carritos abandonados.', 'abandoned_cart', '{"event":"cart_abandoned"}', '{"event":"order_paid"}'),
    ('post_purchase_followup', 'Post-compra automatizado', 'Journey de agradecimiento, educación y soporte post-compra.', 'post_purchase', '{"event":"order_paid"}', '{"event":"refund_requested"}'),
    ('rebuy_reminder', 'Recordatorio de recompra', 'Journey para recompra automatizada y retención.', 'rebuy', '{"days_since_last_order":{"gte":20}}', '{"event":"order_paid"}')
) AS item(journey_key, name, description, journey_type, entry_criteria, exit_criteria)
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, journey_key)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  journey_type = EXCLUDED.journey_type,
  status = 'active',
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO automation_triggers (store_id, trigger_key, name, trigger_type, event_name, status, is_active, conditions, actions, metadata)
SELECT
  s.id,
  item.trigger_key,
  item.name,
  'behavioral',
  item.event_name,
  'active',
  TRUE,
  item.conditions::jsonb,
  item.actions::jsonb,
  jsonb_build_object('source', 'PL17 baseline seed')
FROM stores s
CROSS JOIN (
  VALUES
    ('cart_abandoned_30m', 'Carrito abandonado 30 minutos', 'cart_abandoned', '{"minutes_since_event":30}', '[{"channel":"email","template":"cart_recovery"},{"channel":"push","template":"cart_recovery_push"}]'),
    ('post_purchase_day_1', 'Post-compra día 1', 'order_paid', '{"delay_days":1}', '[{"channel":"email","template":"post_purchase_thank_you"}]'),
    ('rebuy_day_21', 'Recompra día 21', 'rebuy_window_open', '{"days_since_last_order":21}', '[{"channel":"email","template":"rebuy_reminder"},{"channel":"push","template":"rebuy_push"}]')
) AS item(trigger_key, name, event_name, conditions, actions)
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, trigger_key)
DO UPDATE SET
  name = EXCLUDED.name,
  event_name = EXCLUDED.event_name,
  conditions = EXCLUDED.conditions,
  actions = EXCLUDED.actions,
  status = 'active',
  is_active = TRUE,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
