-- CCP-12 / DR-INV-001. Database foundation only; no runtime cutover.
BEGIN;
CREATE TABLE IF NOT EXISTS public.sellable_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL CONSTRAINT uq_sellable_units_sku UNIQUE
    CHECK (sku ~ '^[A-Z0-9_-]+$'),
  barcode text,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  price_override numeric(10,2) CHECK (price_override >= 0),
  cost_price numeric(10,2) CHECK (cost_price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'discontinued')),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(attributes) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sellable_units ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sellable_units_product_id ON public.sellable_units(product_id);
CREATE INDEX IF NOT EXISTS idx_sellable_units_barcode ON public.sellable_units(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellable_units_status ON public.sellable_units(status);
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS sellable_unit_id uuid
  REFERENCES public.sellable_units(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_sellable_unit_id ON public.inventory_movements(sellable_unit_id);

-- The baseline users table has RLS without client policies. Resolve only the
-- caller's staff membership without exposing user records or changing users RLS.
CREATE OR REPLACE FUNCTION public.is_sellable_unit_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'admin'));
$$;
REVOKE ALL ON FUNCTION public.is_sellable_unit_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_sellable_unit_staff() TO authenticated;
DROP POLICY IF EXISTS "Public read active sellable units" ON public.sellable_units;
CREATE POLICY "Public read active sellable units" ON public.sellable_units
  FOR SELECT TO anon, authenticated USING (status = 'active');
DROP POLICY IF EXISTS "Staff manage sellable units" ON public.sellable_units;
CREATE POLICY "Staff manage sellable units" ON public.sellable_units
  FOR ALL TO authenticated USING (public.is_sellable_unit_staff())
  WITH CHECK (public.is_sellable_unit_staff());
-- Stock and fields that invoke parent synchronization are not directly
-- writable by API roles. Audited RPCs lock order -> parents -> units; allowing
-- direct INSERT/DELETE or stock/status/product_id UPDATE would invert that order.
-- Migration/backfill owners retain their explicit offline provisioning path.
REVOKE ALL ON public.sellable_units FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL (id, product_id, sku, barcode, title, price_override, cost_price,
  stock, status, attributes, created_at, updated_at)
  ON public.sellable_units FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.sellable_units TO anon, authenticated, service_role;
GRANT UPDATE (sku, barcode, title, price_override, cost_price, attributes, updated_at)
  ON public.sellable_units TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_parent_product_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE parent_id uuid;
BEGIN
  -- RPCs lock all parents first. Keep the parent lock through aggregation so
  -- concurrent mutations of different children cannot publish a stale sum.
  FOR parent_id IN
    SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.product_id END,
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.product_id END]) x
    WHERE x IS NOT NULL ORDER BY x
  LOOP
    PERFORM 1 FROM public.products WHERE id = parent_id FOR UPDATE;
    UPDATE public.products p SET stock = (
      SELECT COALESCE(sum(s.stock), 0)::integer FROM public.sellable_units s
      WHERE s.product_id = parent_id AND s.status = 'active'
    ), updated_at = now() WHERE p.id = parent_id;
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_parent_product_stock() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_parent_product_stock ON public.sellable_units;
CREATE TRIGGER trg_sync_parent_product_stock
AFTER INSERT OR DELETE OR UPDATE OF stock, status, product_id ON public.sellable_units
FOR EACH ROW EXECUTE FUNCTION public.sync_parent_product_stock();

-- Canonical receipts are append-only, including for privileged RPC callers.
-- Deleting a referenced parent/unit/order with canonical evidence is rejected
-- rather than allowing ON DELETE SET NULL to erase its causal identifiers.
CREATE OR REPLACE FUNCTION public.protect_sellable_unit_movement()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.sellable_unit_id IS NOT NULL THEN RAISE EXCEPTION 'CANONICAL_INVENTORY_MOVEMENT_IMMUTABLE'; END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_sellable_unit_movement() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_protect_sellable_unit_movement ON public.inventory_movements;
CREATE TRIGGER trg_protect_sellable_unit_movement BEFORE UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.protect_sellable_unit_movement();

CREATE OR REPLACE FUNCTION public.decrement_sellable_unit_stock(
  items_input jsonb, order_id_input uuid,
  reason_input text DEFAULT 'sale', notes_input text DEFAULT NULL
) RETURNS TABLE(success boolean, error_code text, failed_sellable_unit_id uuid, available_stock integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE item record; unit public.sellable_units%ROWTYPE; canonical_items jsonb; prior_items jsonb;
BEGIN
  IF items_input IS NULL OR jsonb_typeof(items_input) <> 'array' THEN
    RETURN QUERY SELECT false, 'INVALID_QUANTITY'::text, NULL::uuid, 0; RETURN;
  END IF;
  IF jsonb_array_length(items_input) = 0 THEN
    RETURN QUERY SELECT false, 'INVALID_QUANTITY'::text, NULL::uuid, 0; RETURN;
  END IF;
  -- Validate every element before casting, locking, or writing anything.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(items_input) v
    WHERE jsonb_typeof(v) <> 'object' OR jsonb_typeof(v->'quantity') IS DISTINCT FROM 'number'
      OR COALESCE(v->>'quantity', '') !~ '^[1-9][0-9]*$'
      OR length(v->>'quantity') > 10) THEN
    RETURN QUERY SELECT false, 'INVALID_QUANTITY'::text, NULL::uuid, 0; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(items_input) v
    WHERE (v->>'quantity')::numeric > 2147483647) THEN
    RETURN QUERY SELECT false, 'INVALID_QUANTITY'::text, NULL::uuid, 0; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(items_input) v
    WHERE jsonb_typeof(v->'sellable_unit_id') IS DISTINCT FROM 'string'
      OR COALESCE(v->>'sellable_unit_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN
    RETURN QUERY SELECT false, 'SELLABLE_UNIT_NOT_FOUND'::text, NULL::uuid, 0; RETURN;
  END IF;
  IF reason_input IS NULL OR reason_input NOT IN ('sale', 'manual_adjustment') THEN
    RAISE EXCEPTION 'INVALID_REASON';
  END IF;
  IF order_id_input IS NULL THEN RAISE EXCEPTION 'ORDER_ID_REQUIRED'; END IF;
  PERFORM 1 FROM public.orders WHERE id = order_id_input FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  -- Duplicate units are aggregated; individual availability checks must not
  -- approve a total request larger than stock.
  SELECT jsonb_agg(jsonb_build_object('sellable_unit_id', id, 'quantity', qty) ORDER BY id)
    INTO canonical_items FROM (
      SELECT (v->>'sellable_unit_id')::uuid id, sum((v->>'quantity')::bigint) qty
      FROM jsonb_array_elements(items_input) v GROUP BY 1
    ) requested;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(canonical_items) v WHERE (v->>'quantity')::bigint > 2147483647) THEN
    RETURN QUERY SELECT false, 'INVALID_QUANTITY'::text, NULL::uuid, 0; RETURN;
  END IF;

  -- One canonical sale operation per existing order. Its immutable movements
  -- are the receipt; no new global idempotency ledger or payment schema.
  IF reason_input = 'sale' THEN
    SELECT jsonb_agg(jsonb_build_object('sellable_unit_id', id, 'quantity', qty) ORDER BY id)
      INTO prior_items FROM (
        SELECT sellable_unit_id id, -sum(quantity_delta::bigint) qty
        FROM public.inventory_movements WHERE order_id = order_id_input
          AND reason = 'sale' AND sellable_unit_id IS NOT NULL GROUP BY 1
      ) receipt;
    IF prior_items IS NOT NULL THEN
      IF prior_items <> canonical_items THEN RAISE EXCEPTION 'ORDER_INVENTORY_PAYLOAD_MISMATCH'; END IF;
      RETURN QUERY SELECT true, NULL::text, NULL::uuid, 0; RETURN;
    END IF;
    -- A legacy receipt must never be interpreted as a canonical retry.
    IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE order_id = order_id_input AND reason = 'sale') THEN
      RAISE EXCEPTION 'ORDER_HAS_LEGACY_INVENTORY_MOVEMENTS';
    END IF;
  END IF;
  -- Compatibility trigger also writes parents. Lock parent UUIDs first in a
  -- consistent hierarchy, then lock every requested unit in ascending UUID.
  PERFORM p.id FROM public.products p WHERE p.id IN (
    SELECT s.product_id FROM public.sellable_units s
    JOIN jsonb_array_elements(canonical_items) v ON s.id = (v->>'sellable_unit_id')::uuid
  ) ORDER BY p.id FOR UPDATE;
  FOR item IN SELECT (v->>'sellable_unit_id')::uuid id, (v->>'quantity')::integer qty
    FROM jsonb_array_elements(canonical_items) v ORDER BY 1
  LOOP
    SELECT * INTO unit FROM public.sellable_units WHERE id = item.id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 'SELLABLE_UNIT_NOT_FOUND'::text, item.id, 0; RETURN;
    ELSIF unit.status <> 'active' THEN
      RETURN QUERY SELECT false, 'SELLABLE_UNIT_INACTIVE'::text, item.id, unit.stock; RETURN;
    ELSIF unit.stock < item.qty THEN
      RETURN QUERY SELECT false, 'INSUFFICIENT_STOCK'::text, item.id, unit.stock; RETURN;
    END IF;
  END LOOP;
  -- All validation has completed; any exception rolls back the entire call.
  FOR item IN SELECT (v->>'sellable_unit_id')::uuid id, (v->>'quantity')::integer qty
    FROM jsonb_array_elements(canonical_items) v ORDER BY 1
  LOOP
    UPDATE public.sellable_units SET stock = stock - item.qty, updated_at = now() WHERE id = item.id;
    INSERT INTO public.inventory_movements(sellable_unit_id, product_id, order_id, quantity_delta, reason, notes, created_at)
      SELECT id, product_id, order_id_input, -item.qty, reason_input, notes_input, now()
      FROM public.sellable_units WHERE id = item.id;
  END LOOP;
  RETURN QUERY SELECT true, NULL::text, NULL::uuid, 0;
END;
$$;
REVOKE ALL ON FUNCTION public.decrement_sellable_unit_stock(jsonb, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_sellable_unit_stock(jsonb, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.restock_sellable_unit(
  sellable_unit_id_input uuid, quantity_input integer, order_id_input uuid,
  reason_input text DEFAULT 'refund', notes_input text DEFAULT 'Return restock'
) RETURNS TABLE(success boolean, new_stock integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE updated_stock integer; target_product_id uuid;
BEGIN
  IF quantity_input IS NULL OR quantity_input <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF reason_input IS NULL OR reason_input NOT IN ('refund', 'restock', 'correction', 'manual_adjustment') THEN
    RAISE EXCEPTION 'INVALID_REASON';
  END IF;
  IF order_id_input IS NULL THEN RAISE EXCEPTION 'ORDER_ID_REQUIRED'; END IF;
  PERFORM 1 FROM public.orders WHERE id = order_id_input FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  SELECT product_id INTO target_product_id FROM public.sellable_units WHERE id = sellable_unit_id_input;
  IF NOT FOUND THEN RAISE EXCEPTION 'SELLABLE_UNIT_NOT_FOUND'; END IF;
  PERFORM 1 FROM public.products WHERE id = target_product_id FOR UPDATE;
  UPDATE public.sellable_units SET stock = stock + quantity_input, updated_at = now()
    WHERE id = sellable_unit_id_input RETURNING stock, product_id INTO updated_stock, target_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SELLABLE_UNIT_NOT_FOUND'; END IF;
  INSERT INTO public.inventory_movements(sellable_unit_id, product_id, order_id, quantity_delta, reason, notes, created_at)
    VALUES (sellable_unit_id_input, target_product_id, order_id_input, quantity_input, reason_input, notes_input, now());
  RETURN QUERY SELECT true, updated_stock;
END;
$$;
REVOKE ALL ON FUNCTION public.restock_sellable_unit(uuid, integer, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restock_sellable_unit(uuid, integer, uuid, text, text) TO service_role;
COMMIT;
