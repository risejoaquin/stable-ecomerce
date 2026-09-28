# Inventory Authority & SellableUnit Contract (DR-INV-001)

## 1. Architectural Contract Specification

| Contract Identifier | Classification | Scope | Authoritative Source |
| :--- | :--- | :--- | :--- |
| **DR-INV-001** | **FROZEN CONTRACT** | Global / Omnichannel | Repository Architecture Freeze |

### Invariant Rules:
1. **Exclusive Authority**: The persistent database entity `sellable_units` is the sole transactional authority for item stock across all commercial touchpoints (Web Storefront, Web POS, and Admin).
2. **Catalog Decoupling**: `products` is strictly a catalog and merchandising entity. The column `products.stock` and variant JSONB stock attributes are designated legacy and advisory.
3. **Unit Mapping**:
   - Every standalone product (without variants) maps to exactly one default `SellableUnit`.
   - Every variant product maps to exactly $N$ `SellableUnit` records, corresponding to each distinct selectable variant option (e.g. Size/Color).
4. **Advisory Frontend Stock**: Stock numbers shown in web browsers or POS screens are strictly advisory. Final stock availability is evaluated exclusively inside transactional database stored procedures.
5. **Traceable Movement Ledger**: Every stock mutation must insert an immutable record into `inventory_movements` linked to `sellable_unit_id` and the causing `order_id` (or audit actor).
6. **Zero Oversell Guarantee**: Concurrency is managed via explicit PostgreSQL row-level locks (`SELECT ... FOR UPDATE`). No negative stock balances are allowed.

---

## 2. Database Schema DDL

```sql
-- Migration: Add SellableUnits table and enhance Inventory Movements

CREATE TABLE IF NOT EXISTS sellable_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  barcode TEXT,
  title TEXT NOT NULL,
  price_override DECIMAL(10,2) CHECK (price_override IS NULL OR price_override >= 0),
  cost_price DECIMAL(10,2) CHECK (cost_price IS NULL OR cost_price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'discontinued')),
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uq_sellable_units_sku UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS idx_sellable_units_product_id ON sellable_units(product_id);
CREATE INDEX IF NOT EXISTS idx_sellable_units_barcode ON sellable_units(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellable_units_status ON sellable_units(status);

-- Add sellable_unit_id to existing inventory_movements table
ALTER TABLE inventory_movements 
  ADD COLUMN IF NOT EXISTS sellable_unit_id UUID REFERENCES sellable_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_sellable_unit_id ON inventory_movements(sellable_unit_id);

-- Enable Row Level Security
ALTER TABLE sellable_units ENABLE ROW LEVEL SECURITY;

-- Public can view active sellable units (needed for stock checking/catalog)
CREATE POLICY "Public read active sellable units" ON sellable_units
  FOR SELECT USING (status = 'active');

-- Service role and admin staff have full access
CREATE POLICY "Staff manage sellable units" ON sellable_units
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin')
    )
  );
```

---

## 3. Atomic Concurrency & Stock Allocation RPC

To eliminate race conditions between simultaneous online checkouts and POS cash sales, stock deductions execute via a PostgreSQL stored procedure executing `SELECT ... FOR UPDATE` row locks.

```sql
CREATE OR REPLACE FUNCTION decrement_sellable_unit_stock(
  items_input JSONB, -- Array of { "sellable_unit_id": "uuid", "quantity": int }
  order_id_input UUID,
  reason_input TEXT DEFAULT 'sale',
  notes_input TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT,
  failed_sellable_unit_id UUID,
  available_stock INT
) AS $$
DECLARE
  item RECORD;
  current_stock INT;
  unit_status TEXT;
BEGIN
  -- 1. Sort items to acquire locks in deterministic order and prevent deadlocks
  FOR item IN 
    SELECT 
      (val->>'sellable_unit_id')::UUID AS unit_id,
      (val->>'quantity')::INT AS qty
    FROM jsonb_array_elements(items_input) AS val
    ORDER BY (val->>'sellable_unit_id')::UUID ASC
  LOOP
    IF item.qty <= 0 THEN
      RETURN QUERY SELECT false, 'INVALID_QUANTITY'::TEXT, item.unit_id, 0;
      RETURN;
    END IF;

    -- 2. Lock the row for update
    SELECT stock, status INTO current_stock, unit_status
    FROM sellable_units
    WHERE id = item.unit_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 'SELLABLE_UNIT_NOT_FOUND'::TEXT, item.unit_id, 0;
      RETURN;
    END IF;

    IF unit_status <> 'active' THEN
      RETURN QUERY SELECT false, 'SELLABLE_UNIT_INACTIVE'::TEXT, item.unit_id, current_stock;
      RETURN;
    END IF;

    IF current_stock < item.qty THEN
      -- Insufficient stock: abort transaction and report deficit
      RETURN QUERY SELECT false, 'INSUFFICIENT_STOCK'::TEXT, item.unit_id, current_stock;
      RETURN;
    END IF;
  END LOOP;

  -- 3. All items verified and locked. Execute deductions and movements
  FOR item IN 
    SELECT 
      (val->>'sellable_unit_id')::UUID AS unit_id,
      (val->>'quantity')::INT AS qty
    FROM jsonb_array_elements(items_input) AS val
  LOOP
    UPDATE sellable_units
    SET stock = stock - item.qty,
        updated_at = NOW()
    WHERE id = item.unit_id;

    -- Record movement audit
    INSERT INTO inventory_movements (
      sellable_unit_id,
      product_id,
      order_id,
      quantity_delta,
      reason,
      notes,
      created_at
    )
    SELECT 
      su.id,
      su.product_id,
      order_id_input,
      item.qty * -1,
      reason_input,
      COALESCE(notes_input, 'Atomic stock deduction'),
      NOW()
    FROM sellable_units su
    WHERE su.id = item.unit_id;
  END LOOP;

  -- 4. Success result
  RETURN QUERY SELECT true, NULL::TEXT, NULL::UUID, 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Restock Stored Procedure

```sql
CREATE OR REPLACE FUNCTION restock_sellable_unit(
  sellable_unit_id_input UUID,
  quantity_input INT,
  order_id_input UUID,
  reason_input TEXT DEFAULT 'refund',
  notes_input TEXT DEFAULT 'Return restock'
)
RETURNS TABLE (
  success BOOLEAN,
  new_stock INT
) AS $$
DECLARE
  updated_stock INT;
  target_product_id UUID;
BEGIN
  IF quantity_input <= 0 THEN
    RAISE EXCEPTION 'Restock quantity must be positive';
  END IF;

  UPDATE sellable_units
  SET stock = stock + quantity_input,
      updated_at = NOW()
  WHERE id = sellable_unit_id_input
  RETURNING stock, product_id INTO updated_stock, target_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SellableUnit not found: %', sellable_unit_id_input;
  END IF;

  INSERT INTO inventory_movements (
    sellable_unit_id,
    product_id,
    order_id,
    quantity_delta,
    reason,
    notes,
    created_at
  ) VALUES (
    sellable_unit_id_input,
    target_product_id,
    order_id_input,
    quantity_input,
    reason_input,
    notes_input,
    NOW()
  );

  RETURN QUERY SELECT true, updated_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Dual-Write & Compatibility Trigger (Migration Period)

During the non-destructive rollout, updating `sellable_units.stock` propagates back to the parent `products.stock` (summed across units) to prevent legacy storefront screens from breaking before full cutover.

```sql
CREATE OR REPLACE FUNCTION sync_parent_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  total_unit_stock INT;
BEGIN
  SELECT COALESCE(SUM(stock), 0) INTO total_unit_stock
  FROM sellable_units
  WHERE product_id = NEW.product_id AND status = 'active';

  UPDATE products
  SET stock = total_unit_stock,
      updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_parent_product_stock ON sellable_units;
CREATE TRIGGER trg_sync_parent_product_stock
AFTER INSERT OR UPDATE OF stock, status ON sellable_units
FOR EACH ROW
EXECUTE FUNCTION sync_parent_product_stock();
```

---

## 6. TypeScript Interface Definition

```typescript
export interface SellableUnit {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  title: string;
  priceOverride: number | null;
  costPrice: number | null;
  stock: number;
  status: 'active' | 'archived' | 'discontinued';
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface DecrementStockPayload {
  items: Array<{
    sellableUnitId: string;
    quantity: number;
  }>;
  orderId: string;
  reason?: 'sale' | 'manual_adjustment';
  notes?: string;
}

export interface DecrementStockResult {
  success: boolean;
  errorCode?: 'INSUFFICIENT_STOCK' | 'SELLABLE_UNIT_NOT_FOUND' | 'SELLABLE_UNIT_INACTIVE' | 'INVALID_QUANTITY';
  failedSellableUnitId?: string;
  availableStock?: number;
}
```
