-- CCP-13 / DR-PAY-001. Additive foundation; legacy web checkout is not cut over.
BEGIN;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_request_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'web_storefront'
    CHECK (channel IN ('web_storefront','pos_register')),
  ADD COLUMN IF NOT EXISTS cashier_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_terminal_id text,
  ADD COLUMN IF NOT EXISTS receipt_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS shipping_cost numeric(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON public.orders(channel);
CREATE INDEX IF NOT EXISTS idx_orders_cashier_user_id ON public.orders(cashier_user_id) WHERE cashier_user_id IS NOT NULL;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS sellable_unit_id uuid REFERENCES public.sellable_units(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS total_price numeric(10,2) CHECK (total_price >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
CREATE INDEX IF NOT EXISTS idx_order_items_sellable_unit_id ON public.order_items(sellable_unit_id);

CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_channel text NOT NULL CHECK (payment_channel IN ('stripe','cash','card_reference')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0 AND amount <> 'NaN'::numeric),
  currency text NOT NULL DEFAULT 'mxn' CHECK (currency IN ('mxn','usd')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','captured','failed','partially_refunded','refunded')),
  idempotency_key text NOT NULL UNIQUE CHECK (length(btrim(idempotency_key)) > 0 AND idempotency_key = btrim(idempotency_key)),
  reference_code text,
  tender_details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(tender_details) = 'object'),
  refunded_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_refund_limit CHECK (refunded_amount >= 0 AND refunded_amount <= amount AND refunded_amount <> 'NaN'::numeric),
  CONSTRAINT chk_payment_refund_status CHECK (
    (status IN ('pending','captured','failed') AND refunded_amount = 0) OR
    (status = 'partially_refunded' AND refunded_amount > 0 AND refunded_amount < amount) OR
    (status = 'refunded' AND refunded_amount = amount)),
  CONSTRAINT chk_cash_tender CHECK (payment_channel <> 'cash' OR COALESCE(
    tender_details->>'tenderType' = 'cash'
    AND jsonb_typeof(tender_details->'amountTendered') = 'number'
    AND jsonb_typeof(tender_details->'changeGiven') = 'number'
    AND (tender_details->>'amountTendered')::numeric >= amount
    AND (tender_details->>'changeGiven')::numeric = (tender_details->>'amountTendered')::numeric - amount, false)),
  CONSTRAINT chk_card_reference CHECK (payment_channel <> 'card_reference' OR COALESCE(
    reference_code = btrim(reference_code) AND reference_code ~ '^[A-Za-z0-9-]+$'
    AND length(regexp_replace(reference_code, '[^A-Za-z0-9]', '', 'g')) >= 4
    AND tender_details->>'tenderType' = 'card_reference'
    AND tender_details->>'referenceCode' = reference_code, false)),
  CONSTRAINT chk_non_stripe_metadata CHECK (payment_channel = 'stripe' OR (
    NOT tender_details ?| ARRAY['stripeSessionId','stripePaymentIntentId']
    AND (reference_code IS NULL OR reference_code !~ '^(pi_|cs_|ch_)')))
);
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_channel ON public.order_payments(payment_channel);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON public.order_payments(status);
CREATE INDEX IF NOT EXISTS idx_order_payments_ref_code ON public.order_payments(reference_code) WHERE reference_code IS NOT NULL;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- Baseline users/orders RLS has no customer policies. Helpers inspect only the
-- current actor's membership/ownership, avoiding both recursive RLS and exposure.
CREATE OR REPLACE FUNCTION public.can_read_order_payment(order_id_input uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = order_id_input AND customer_user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.can_read_order_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_order_payment(uuid) TO authenticated;
DROP POLICY IF EXISTS "Customers view own order payments" ON public.order_payments;
CREATE POLICY "Customers view own order payments" ON public.order_payments FOR SELECT TO authenticated
  USING (public.can_read_order_payment(order_id));
DROP POLICY IF EXISTS "Staff manage order payments" ON public.order_payments;
CREATE POLICY "Staff manage order payments" ON public.order_payments FOR ALL TO authenticated
  USING (public.is_sellable_unit_staff()) WITH CHECK (public.is_sellable_unit_staff());
REVOKE ALL ON public.order_payments FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_order_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'PAYMENT_LEDGER_IMMUTABLE'; END IF;
  IF TG_OP = 'UPDATE' AND ROW(NEW.id,NEW.order_id,NEW.payment_channel,NEW.amount,NEW.currency,
      NEW.idempotency_key,NEW.reference_code,NEW.tender_details,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.order_id,OLD.payment_channel,OLD.amount,OLD.currency,
      OLD.idempotency_key,OLD.reference_code,OLD.tender_details,OLD.created_at) THEN
    RAISE EXCEPTION 'PAYMENT_SALE_EVIDENCE_IMMUTABLE';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.refunded_amount < OLD.refunded_amount OR
    (OLD.status IN ('captured','partially_refunded','refunded') AND NEW.status IN ('pending','failed')) OR
    (OLD.status = 'failed' AND NEW.status <> 'failed')) THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_TRANSITION';
  END IF;
  SELECT * INTO o FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  IF NEW.currency IS DISTINCT FROM o.currency THEN RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH'; END IF;
  IF NEW.payment_channel <> 'stripe' AND o.channel <> 'pos_register' THEN
    RAISE EXCEPTION 'NON_STRIPE_PAYMENT_REQUIRES_POS_ORDER';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_order_payment ON public.order_payments;
CREATE TRIGGER trg_validate_order_payment BEFORE INSERT OR UPDATE OR DELETE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_payment();

CREATE OR REPLACE FUNCTION public.validate_canonical_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.order_payments WHERE order_id = OLD.id) AND
    ROW(NEW.id,NEW.total,NEW.subtotal,NEW.discount_amount,NEW.shipping_cost,NEW.tax_amount,
      NEW.currency,NEW.channel,NEW.client_request_id,NEW.cashier_user_id,NEW.pos_terminal_id,NEW.receipt_number)
    IS DISTINCT FROM ROW(OLD.id,OLD.total,OLD.subtotal,OLD.discount_amount,OLD.shipping_cost,OLD.tax_amount,
      OLD.currency,OLD.channel,OLD.client_request_id,OLD.cashier_user_id,OLD.pos_terminal_id,OLD.receipt_number) THEN
    RAISE EXCEPTION 'ORDER_SALE_EVIDENCE_IMMUTABLE';
  END IF;
  IF NEW.channel = 'pos_register' THEN
    IF NEW.client_request_id IS NULL OR NEW.cashier_user_id IS NULL THEN
      RAISE EXCEPTION 'POS_REQUIRES_REQUEST_ID_AND_STAFF_CASHIER';
    END IF;
    IF (TG_OP = 'INSERT' OR NEW.cashier_user_id IS DISTINCT FROM OLD.cashier_user_id) AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = NEW.cashier_user_id AND role IN ('owner','admin')) THEN
      RAISE EXCEPTION 'POS_REQUIRES_REQUEST_ID_AND_STAFF_CASHIER';
    END IF;
    IF NEW.stripe_session_id IS NOT NULL OR NEW.stripe_payment_intent_id IS NOT NULL THEN
      RAISE EXCEPTION 'POS_STRIPE_IDENTIFIERS_PROHIBITED';
    END IF;
    IF NEW.discount_amount IS NULL OR NEW.currency NOT IN ('mxn','usd') OR NEW.currency IS NULL OR
      NEW.total <> NEW.subtotal - NEW.discount_amount + NEW.shipping_cost + NEW.tax_amount OR
      NEW.total = 'NaN'::numeric OR NEW.subtotal = 'NaN'::numeric THEN
      RAISE EXCEPTION 'INVALID_ORDER_FINANCIAL_TOTAL';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_canonical_order ON public.orders;
CREATE TRIGGER trg_validate_canonical_order BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_canonical_order();

CREATE OR REPLACE FUNCTION public.validate_canonical_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE u public.sellable_units%ROWTYPE; o public.orders%ROWTYPE; pos boolean; s jsonb;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.sellable_unit_id IS NOT NULL THEN
    IF TG_OP = 'DELETE' OR NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'ORDER_ITEM_SNAPSHOT_IMMUTABLE'; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  SELECT * INTO o FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  pos := o.channel = 'pos_register';
  -- Build canonical items before settlement. A settled state or captured
  -- payment freezes the item set, even for zero-price additions or a later
  -- order-status change. Orders without canonical evidence keep their legacy compatibility path.
  IF TG_OP = 'INSERT' AND (NEW.sellable_unit_id IS NOT NULL OR pos
    OR EXISTS (SELECT 1 FROM public.order_items WHERE order_id = NEW.order_id AND sellable_unit_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM public.order_payments WHERE order_id = NEW.order_id)) AND (
    o.status IN ('pagado','empacado','enviado','entregado','inventory_exception','partially_refunded','refunded')
    OR o.paid_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.order_payments
      WHERE order_id = NEW.order_id AND status IN ('captured','partially_refunded','refunded'))) THEN
    RAISE EXCEPTION 'ORDER_ITEM_SET_SETTLED_IMMUTABLE';
  END IF;
  IF pos AND NEW.sellable_unit_id IS NULL THEN RAISE EXCEPTION 'POS_ITEM_REQUIRES_EXACT_SELLABLE_UNIT'; END IF;
  IF NEW.sellable_unit_id IS NOT NULL THEN
    SELECT * INTO u FROM public.sellable_units WHERE id = NEW.sellable_unit_id;
    IF NOT FOUND OR NEW.order_id IS NULL OR NEW.product_id IS DISTINCT FROM u.product_id OR NEW.sku IS DISTINCT FROM u.sku THEN
      RAISE EXCEPTION 'ORDER_ITEM_SELLABLE_UNIT_MISMATCH';
    END IF;
    s := NEW.product_snapshot;
    IF s IS NULL OR jsonb_typeof(s) <> 'object' OR NOT s ?& ARRAY['productName','unitTitle','sku','attributes','originalPrice','settledPrice']
      OR jsonb_typeof(s->'productName') IS DISTINCT FROM 'string' OR length(btrim(s->>'productName')) = 0
      OR jsonb_typeof(s->'unitTitle') IS DISTINCT FROM 'string' OR length(btrim(s->>'unitTitle')) = 0
      OR s->>'sku' IS DISTINCT FROM NEW.sku OR jsonb_typeof(s->'attributes') IS DISTINCT FROM 'object'
      OR jsonb_typeof(s->'originalPrice') IS DISTINCT FROM 'number' OR jsonb_typeof(s->'settledPrice') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'ORDER_ITEM_SNAPSHOT_REQUIRED';
    END IF;
    IF NEW.total_price IS NULL OR NEW.total_price <> NEW.unit_price * NEW.quantity
      OR (s->>'settledPrice')::numeric <> NEW.unit_price OR (s->>'originalPrice')::numeric < 0
      OR NEW.unit_price = 'NaN'::numeric OR NEW.tax_amount = 'NaN'::numeric OR NEW.discount_amount = 'NaN'::numeric THEN
      RAISE EXCEPTION 'INVALID_ORDER_ITEM_FINANCIAL_TOTAL';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_canonical_order_item ON public.order_items;
CREATE TRIGGER trg_validate_canonical_order_item BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_canonical_order_item();

-- Refund states still represent captured principal. Compare gross amounts to
-- the original sale, and refunds separately; pending/failed rows never count.
CREATE OR REPLACE FUNCTION public.verify_order_payment_reconciliation(order_id_input uuid)
RETURNS TABLE(order_id uuid, order_total numeric(10,2), captured_total numeric(10,2), is_balanced boolean, discrepancy numeric(10,2))
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT o.id, o.total, COALESCE(sum(p.amount),0)::numeric(10,2),
    o.total = COALESCE(sum(p.amount),0)
      AND COALESCE(o.refunded_amount,0) = COALESCE(sum(p.refunded_amount),0)
      AND COALESCE(bool_and(p.currency = o.currency),true),
    (COALESCE(sum(p.amount),0) - o.total)::numeric(10,2)
  FROM public.orders o LEFT JOIN public.order_payments p ON p.order_id = o.id
    AND p.status IN ('captured','partially_refunded','refunded')
  WHERE o.id = order_id_input GROUP BY o.id;
$$;
REVOKE ALL ON FUNCTION public.verify_order_payment_reconciliation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_order_payment_reconciliation(uuid) TO service_role;

-- Deferred checks support order -> items -> payments in one POS transaction.
-- Legacy web finalization remains unchanged until its separate runtime cutover.
CREATE OR REPLACE FUNCTION public.check_pos_order_reconciliation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE oid uuid; o public.orders%ROWTYPE; captured numeric;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN oid := NEW.id;
  ELSE oid := COALESCE(NEW.order_id, OLD.order_id); END IF;
  SELECT * INTO o FROM public.orders WHERE id = oid FOR UPDATE;
  IF o.channel = 'pos_register' THEN
    IF o.subtotal <> (SELECT COALESCE(sum(total_price),0) FROM public.order_items WHERE order_id = oid)
      OR NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = oid) THEN
      RAISE EXCEPTION 'ORDER_ITEM_SUBTOTAL_MISMATCH';
    END IF;
    SELECT COALESCE(sum(amount),0) INTO captured FROM public.order_payments
      WHERE order_id = oid AND status IN ('captured','partially_refunded','refunded');
    IF o.status IN ('pagado','empacado','enviado','entregado','partially_refunded','refunded') AND captured < o.total THEN
      RAISE EXCEPTION 'ORDER_PAYMENT_NOT_CAPTURED';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_pos_order_reconciliation ON public.orders;
CREATE CONSTRAINT TRIGGER trg_pos_order_reconciliation AFTER INSERT OR UPDATE ON public.orders
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_pos_order_reconciliation();
DROP TRIGGER IF EXISTS trg_pos_payment_reconciliation ON public.order_payments;
CREATE CONSTRAINT TRIGGER trg_pos_payment_reconciliation AFTER INSERT OR UPDATE ON public.order_payments
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_pos_order_reconciliation();
DROP TRIGGER IF EXISTS trg_pos_item_reconciliation ON public.order_items;
CREATE CONSTRAINT TRIGGER trg_pos_item_reconciliation AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_pos_order_reconciliation();
REVOKE ALL ON FUNCTION public.validate_order_payment(), public.validate_canonical_order(),
  public.validate_canonical_order_item(), public.check_pos_order_reconciliation() FROM PUBLIC, anon, authenticated;
COMMIT;
