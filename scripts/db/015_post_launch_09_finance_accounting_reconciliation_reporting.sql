-- POST-LAUNCH 09 — Finance, Accounting, Reconciliation & Admin Reporting
-- Idempotent production migration for finance controls, daily close, reconciliation and exports.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'unreconciled',
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS accounting_notes TEXT;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(8,2);

CREATE TABLE IF NOT EXISTS finance_daily_closes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  order_count INTEGER DEFAULT 0,
  gross_sales NUMERIC(12,2) DEFAULT 0,
  net_sales NUMERIC(12,2) DEFAULT 0,
  refund_total NUMERIC(12,2) DEFAULT 0,
  discount_total NUMERIC(12,2) DEFAULT 0,
  tax_total NUMERIC(12,2) DEFAULT 0,
  payment_fees_estimate NUMERIC(12,2) DEFAULT 0,
  cash_adjustments NUMERIC(12,2) DEFAULT 0,
  exception_count INTEGER DEFAULT 0,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, business_date)
);

CREATE TABLE IF NOT EXISTS finance_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  checked_orders INTEGER DEFAULT 0,
  exception_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS finance_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES finance_reconciliation_runs(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  stripe_event_id TEXT,
  issue_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS finance_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  file_name TEXT,
  row_count INTEGER DEFAULT 0,
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  adjustment_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'approved',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_financial_status_updated_at ON orders(financial_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at_status ON orders(paid_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_finance_daily_closes_store_date ON finance_daily_closes(store_id, business_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_runs_store_started ON finance_reconciliation_runs(store_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_items_status ON finance_reconciliation_items(status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_exports_store_created ON finance_exports(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_adjustments_store_created ON accounting_adjustments(store_id, created_at DESC);

UPDATE orders
SET financial_status = CASE
  WHEN status IN ('pagado','empacado','enviado','entregado','partially_refunded') AND stripe_payment_intent_id IS NOT NULL THEN 'reconciled'
  WHEN status IN ('cancelado','refunded') THEN 'closed'
  ELSE COALESCE(financial_status, 'unreconciled')
END,
reconciled_at = CASE
  WHEN status IN ('pagado','empacado','enviado','entregado','partially_refunded') AND stripe_payment_intent_id IS NOT NULL THEN COALESCE(reconciled_at, updated_at, NOW())
  ELSE reconciled_at
END
WHERE financial_status IS NULL OR financial_status = 'unreconciled';

INSERT INTO operational_events(event_type, severity, message, metadata, created_at)
VALUES (
  'post_launch_09_migration_applied',
  'info',
  'POST-LAUNCH 09 finance, accounting, reconciliation and admin reporting migration applied.',
  jsonb_build_object('migration', '015_post_launch_09_finance_accounting_reconciliation_reporting'),
  NOW()
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
