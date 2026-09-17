-- ==============================================================================
-- Migration Candidate: 044_security_definer_critical_functions_hardening.sql
-- Description: Hardening of public functions and atomic full-order refund restock
-- Status: CANDIDATE ONLY - DO NOT APPLY TO PRODUCTION WITHOUT CHATGPT WEB APPROVAL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TASK 3: SCHEMA EXTENSION FOR IDEMPOTENT RESTOCK TRACKING
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_restocked_at TIMESTAMPTZ NULL;

-- ------------------------------------------------------------------------------
-- 2. TASK 5: DROP OBSOLETE UNUSED FUNCTIONS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.decrement_stock(UUID, INT);
DROP FUNCTION IF EXISTS public.consume_coupon_after_payment(TEXT, UUID);

-- ------------------------------------------------------------------------------
-- 3. TASK 4: RECREATE finalize_paid_order WITH SECURITY INVOKER & SCHEMA QUALIFICATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_paid_order(
  order_id_input UUID,
  stripe_session_id_input TEXT,
  stripe_payment_intent_id_input TEXT,
  customer_email_input TEXT
)
RETURNS TABLE(success BOOLEAN, final_status TEXT, message TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  locked_order public.orders%ROWTYPE;
  item_record RECORD;
  updated_count INT;
BEGIN
  SELECT * INTO locked_order
  FROM public.orders
  WHERE id = order_id_input
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'missing'::TEXT, 'ORDER_NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  IF locked_order.status IN ('pagado', 'empacado', 'enviado', 'entregado', 'refunded', 'partially_refunded') THEN
    RETURN QUERY SELECT true, locked_order.status::TEXT, 'ORDER_ALREADY_FINALIZED'::TEXT;
    RETURN;
  END IF;

  IF locked_order.status <> 'pendiente' THEN
    RETURN QUERY SELECT false, locked_order.status::TEXT, 'ORDER_NOT_PAYABLE'::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = order_id_input) THEN
    UPDATE public.orders
    SET status = 'inventory_exception',
        notes = 'Paid order has no order_items and requires manual reconciliation.',
        stripe_session_id = stripe_session_id_input,
        stripe_payment_intent_id = stripe_payment_intent_id_input,
        customer_email = COALESCE(customer_email_input, customer_email),
        paid_at = COALESCE(paid_at, NOW()),
        updated_at = NOW()
    WHERE id = order_id_input;

    RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'ORDER_HAS_NO_ITEMS'::TEXT;
    RETURN;
  END IF;

  FOR item_record IN
    SELECT oi.product_id, oi.quantity, p.stock, p.name
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = order_id_input
  LOOP
    IF item_record.product_id IS NULL OR item_record.stock IS NULL OR item_record.stock < item_record.quantity THEN
      UPDATE public.orders
      SET status = 'inventory_exception',
          notes = 'Stripe payment confirmed, but stock was insufficient for product ' || COALESCE(item_record.name, item_record.product_id::TEXT),
          stripe_session_id = stripe_session_id_input,
          stripe_payment_intent_id = stripe_payment_intent_id_input,
          customer_email = COALESCE(customer_email_input, customer_email),
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
      WHERE id = order_id_input;

      RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'INSUFFICIENT_STOCK'::TEXT;
      RETURN;
    END IF;
  END LOOP;

  FOR item_record IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = order_id_input
  LOOP
    UPDATE public.products
    SET stock = stock - item_record.quantity,
        updated_at = NOW()
    WHERE id = item_record.product_id
      AND stock >= item_record.quantity;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    IF updated_count = 0 THEN
      UPDATE public.orders
      SET status = 'inventory_exception',
          notes = 'Stripe payment confirmed, but stock decrement failed during finalization.',
          stripe_session_id = stripe_session_id_input,
          stripe_payment_intent_id = stripe_payment_intent_id_input,
          customer_email = COALESCE(customer_email_input, customer_email),
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
      WHERE id = order_id_input;

      RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'STOCK_DECREMENT_FAILED'::TEXT;
      RETURN;
    END IF;

    INSERT INTO public.inventory_movements(product_id, order_id, quantity_delta, reason, notes)
    VALUES(item_record.product_id, order_id_input, item_record.quantity * -1, 'sale', 'Stripe payment confirmed');
  END LOOP;

  IF locked_order.coupon_code IS NOT NULL THEN
    UPDATE public.coupons
    SET current_uses = current_uses + 1,
        updated_at = NOW()
    WHERE code = locked_order.coupon_code
      AND store_id = locked_order.store_id
      AND is_active = true
      AND (max_uses IS NULL OR current_uses < max_uses);
  END IF;

  UPDATE public.orders
  SET status = 'pagado',
      stripe_session_id = stripe_session_id_input,
      stripe_payment_intent_id = stripe_payment_intent_id_input,
      customer_email = COALESCE(customer_email_input, customer_email),
      paid_at = COALESCE(paid_at, NOW()),
      notes = NULL,
      updated_at = NOW()
  WHERE id = order_id_input;

  RETURN QUERY SELECT true, 'pagado'::TEXT, 'ORDER_FINALIZED'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. TASK 2: CREATE restock_refunded_order (ATOMIC & IDEMPOTENT ORDER-LEVEL RESTOCK)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restock_refunded_order(order_id_input UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_updated_count INT;
  v_has_items BOOLEAN := false;
BEGIN
  IF order_id_input IS NULL THEN
    RAISE EXCEPTION 'INVALID_ORDER: order_id_input cannot be null';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = order_id_input
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: order % does not exist', order_id_input;
  END IF;

  -- Idempotency check: if order has already been restocked, no-op and return ALREADY_RESTOCKED
  IF v_order.inventory_restocked_at IS NOT NULL THEN
    RETURN QUERY SELECT true, 'ALREADY_RESTOCKED'::TEXT;
    RETURN;
  END IF;

  -- Order must be in 'refunded' status to restock
  IF v_order.status <> 'refunded' THEN
    RAISE EXCEPTION 'ORDER_NOT_REFUNDED: order % has status % but must be refunded', order_id_input, v_order.status;
  END IF;

  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = order_id_input
  LOOP
    v_has_items := true;

    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ORDER_ITEM: null product_id encountered in order %', order_id_input;
    END IF;

    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_ORDER_ITEM_QUANTITY: invalid quantity % for product % in order %',
        v_item.quantity, v_item.product_id, order_id_input;
    END IF;

    UPDATE public.products
    SET stock = stock + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN
      RAISE EXCEPTION 'PRODUCT_UPDATE_FAILED: expected to update 1 product row for %, updated %',
        v_item.product_id, v_updated_count;
    END IF;

    INSERT INTO public.inventory_movements(
      product_id,
      order_id,
      quantity_delta,
      reason,
      notes
    )
    VALUES(
      v_item.product_id,
      order_id_input,
      v_item.quantity,
      'refund',
      'Full order refund restock'
    );
  END LOOP;

  IF NOT v_has_items THEN
    RAISE EXCEPTION 'ORDER_HAS_NO_ITEMS: order % has no items to restock', order_id_input;
  END IF;

  UPDATE public.orders
  SET inventory_restocked_at = NOW(),
      updated_at = NOW()
  WHERE id = order_id_input;

  RETURN QUERY SELECT true, 'ORDER_RESTOCKED'::TEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.restock_refunded_order(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restock_refunded_order(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.restock_refunded_order(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.restock_refunded_order(UUID) TO service_role;
