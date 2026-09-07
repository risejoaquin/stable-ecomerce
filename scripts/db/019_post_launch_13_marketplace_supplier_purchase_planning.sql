-- POST-LAUNCH 13 — Marketplace Readiness, Supplier Operations & Purchase Planning
-- Objetivo: proveedores, costos, órdenes de compra, planeación de inventario,
-- reposición sugerida, lead times, márgenes por proveedor, catálogo proveedor
-- y alertas de stock proyectado.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS primary_supplier_id UUID,
  ADD COLUMN IF NOT EXISTS supplier_sku TEXT,
  ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS preferred_supplier_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS last_replenishment_reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_key TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_amount NUMERIC(12,2) DEFAULT 0,
  payment_terms TEXT DEFAULT 'manual',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, supplier_key)
);

CREATE TABLE IF NOT EXISTS supplier_product_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  currency TEXT DEFAULT 'MXN',
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  previous_unit_cost NUMERIC(12,2),
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_preferred BOOLEAN DEFAULT FALSE,
  minimum_order_quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  supplier_sku TEXT,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  status TEXT DEFAULT 'active',
  unit_cost NUMERIC(12,2) DEFAULT 0,
  msrp NUMERIC(12,2),
  available_quantity INTEGER,
  minimum_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 7,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  order_date DATE DEFAULT CURRENT_DATE,
  expected_arrival_date DATE,
  received_at TIMESTAMPTZ,
  subtotal_amount NUMERIC(12,2) DEFAULT 0,
  shipping_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'MXN',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, po_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  sku TEXT,
  supplier_sku TEXT,
  product_name TEXT NOT NULL,
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_received INTEGER DEFAULT 0,
  unit_cost NUMERIC(12,2) DEFAULT 0,
  line_total NUMERIC(12,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_planning_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  sku TEXT,
  product_name TEXT,
  current_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 5,
  reorder_quantity INTEGER DEFAULT 10,
  average_daily_sales NUMERIC(12,4) DEFAULT 0,
  days_of_supply NUMERIC(12,2),
  lead_time_days INTEGER DEFAULT 7,
  projected_stockout_date DATE,
  planning_status TEXT DEFAULT 'monitor',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_replenishment_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT,
  product_name TEXT,
  current_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 5,
  suggested_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 7,
  projected_stockout_date DATE,
  status TEXT DEFAULT 'recommended',
  recommendation_reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_lead_time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  expected_days INTEGER DEFAULT 7,
  actual_days INTEGER,
  status TEXT DEFAULT 'tracked',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_margin_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  supplier_name TEXT,
  unit_cost NUMERIC(12,2) DEFAULT 0,
  sell_price NUMERIC(12,2) DEFAULT 0,
  margin_amount NUMERIC(12,2) DEFAULT 0,
  margin_percent NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'current',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projected_stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT,
  product_name TEXT,
  current_stock INTEGER DEFAULT 0,
  projected_stock INTEGER DEFAULT 0,
  alert_type TEXT DEFAULT 'projected_low_stock',
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  projected_date DATE,
  recommendation TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_store_status ON suppliers(store_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_product_costs_product ON supplier_product_costs(product_id, is_preferred);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_items_supplier ON supplier_catalog_items(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_store_status ON purchase_orders(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_planning_snapshots_store_created ON inventory_planning_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_status ON supplier_replenishment_suggestions(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_lead_time_logs_supplier ON supplier_lead_time_logs(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_margin_snapshots_store_created ON supplier_margin_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projected_stock_alerts_status ON projected_stock_alerts(store_id, status, severity);

-- Default supplier and baseline planning rows for current catalog.
INSERT INTO suppliers (store_id, supplier_key, name, status, contact_email, lead_time_days, payment_terms, metadata)
SELECT s.id, 'default_supplier', 'Default Supplier', 'active', 'suppliers@selfcaresinners.com', 7, 'manual', jsonb_build_object('source','PL13 seed')
FROM stores s
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, supplier_key) DO UPDATE SET
  name = COALESCE(suppliers.name, EXCLUDED.name),
  status = COALESCE(suppliers.status, EXCLUDED.status),
  updated_at = NOW();

UPDATE products p
SET primary_supplier_id = COALESCE(p.primary_supplier_id, ds.id),
    reorder_point = COALESCE(p.reorder_point, p.low_stock_threshold, 5),
    reorder_quantity = COALESCE(p.reorder_quantity, 10),
    lead_time_days = COALESCE(p.lead_time_days, ds.lead_time_days, 7),
    last_replenishment_reviewed_at = COALESCE(p.last_replenishment_reviewed_at, NOW())
FROM suppliers ds, stores s
WHERE ds.store_id = s.id
  AND s.slug = 'selfcare-sinners'
  AND p.store_id = s.id;

INSERT INTO supplier_catalog_items (store_id, supplier_id, product_id, supplier_sku, product_name, brand, category, status, unit_cost, lead_time_days, metadata)
SELECT p.store_id, p.primary_supplier_id, p.id, COALESCE(p.supplier_sku, p.sku), p.name, p.brand, p.collection, 'active', COALESCE(p.cost, p.preferred_supplier_cost, 0), COALESCE(p.lead_time_days, 7), jsonb_build_object('source','PL13 catalog seed')
FROM products p
WHERE p.store_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM supplier_catalog_items sci WHERE sci.product_id = p.id AND sci.supplier_id IS NOT DISTINCT FROM p.primary_supplier_id
  );

INSERT INTO supplier_product_costs (store_id, supplier_id, product_id, supplier_sku, unit_cost, is_preferred, minimum_order_quantity, metadata)
SELECT p.store_id, p.primary_supplier_id, p.id, COALESCE(p.supplier_sku, p.sku), COALESCE(p.cost, p.preferred_supplier_cost, 0), TRUE, 1, jsonb_build_object('source','PL13 cost seed')
FROM products p
WHERE p.store_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM supplier_product_costs spc WHERE spc.product_id = p.id AND spc.is_preferred = TRUE
  );

INSERT INTO inventory_planning_snapshots (store_id, product_id, supplier_id, sku, product_name, current_stock, reorder_point, reorder_quantity, lead_time_days, projected_stockout_date, planning_status, metadata)
SELECT p.store_id, p.id, p.primary_supplier_id, p.sku, p.name, COALESCE(p.stock,0), COALESCE(p.reorder_point, p.low_stock_threshold, 5), COALESCE(p.reorder_quantity, 10), COALESCE(p.lead_time_days, 7), CURRENT_DATE + GREATEST(COALESCE(p.stock,0),1), CASE WHEN COALESCE(p.stock,0) <= COALESCE(p.reorder_point, p.low_stock_threshold, 5) THEN 'reorder' ELSE 'monitor' END, jsonb_build_object('source','PL13 planning seed')
FROM products p
WHERE p.store_id IS NOT NULL;

INSERT INTO supplier_margin_snapshots (store_id, supplier_id, product_id, product_name, supplier_name, unit_cost, sell_price, margin_amount, margin_percent, metadata)
SELECT p.store_id, p.primary_supplier_id, p.id, p.name, s.name,
       COALESCE(p.cost, p.preferred_supplier_cost, 0), COALESCE(p.price,0),
       COALESCE(p.price,0) - COALESCE(p.cost, p.preferred_supplier_cost, 0),
       CASE WHEN COALESCE(p.price,0) > 0 THEN ROUND(((COALESCE(p.price,0) - COALESCE(p.cost, p.preferred_supplier_cost, 0)) / COALESCE(p.price,0)) * 100, 2) ELSE 0 END,
       jsonb_build_object('source','PL13 margin seed')
FROM products p
LEFT JOIN suppliers s ON s.id = p.primary_supplier_id
WHERE p.store_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
