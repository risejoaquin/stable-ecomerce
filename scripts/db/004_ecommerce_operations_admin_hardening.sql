-- Selfcare Sinners - Phase C Ecommerce Operations & Admin Hardening
-- Safe to run after 001/002/003 migrations.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id_created_at ON order_timeline(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(store_id, stock, status);
CREATE INDEX IF NOT EXISTS idx_coupons_store_code ON coupons(store_id, code);

-- Backfill order timeline from current order states for operational visibility.
INSERT INTO order_timeline(order_id, event_type, to_status, metadata, created_at)
SELECT id, 'phase_c_backfill', status, jsonb_build_object('source', '004_ecommerce_operations_admin_hardening'), created_at
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_timeline ot
  WHERE ot.order_id = o.id
    AND ot.event_type = 'phase_c_backfill'
);

NOTIFY pgrst, 'reload schema';
