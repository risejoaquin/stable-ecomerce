-- Selfcare Sinners - Hotfix B.1 Webhook Finalization Resilience
-- Safe to run after 001_selfcare_sinners_production_schema.sql and 002_payment_order_integrity.sql.

ALTER TABLE stripe_events
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripe_events(processed_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_id ON inventory_movements(order_id);

DROP FUNCTION IF EXISTS finalize_paid_order(UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION finalize_paid_order(
  order_id_input UUID,
  stripe_session_id_input TEXT,
  stripe_payment_intent_id_input TEXT,
  customer_email_input TEXT
)
RETURNS TABLE(success BOOLEAN, final_status TEXT, message TEXT) AS $$
DECLARE
  locked_order orders%ROWTYPE;
  item_record RECORD;
  updated_count INT;
BEGIN
  SELECT * INTO locked_order
  FROM orders
  WHERE id = order_id_input
  FOR UPDATE;

  IF NOT FOUND THEN
    success := false;
    final_status := 'missing';
    message := 'ORDER_NOT_FOUND';
    RETURN NEXT;
    RETURN;
  END IF;

  IF locked_order.status IN ('pagado', 'empacado', 'enviado', 'entregado', 'refunded', 'partially_refunded') THEN
    UPDATE orders
    SET stripe_session_id = COALESCE(stripe_session_id, stripe_session_id_input),
        stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, stripe_payment_intent_id_input),
        customer_email = COALESCE(customer_email, customer_email_input),
        paid_at = COALESCE(paid_at, NOW()),
        updated_at = NOW()
    WHERE id = order_id_input;

    success := true;
    final_status := locked_order.status::TEXT;
    message := 'ORDER_ALREADY_FINALIZED';
    RETURN NEXT;
    RETURN;
  END IF;

  IF locked_order.status <> 'pendiente' THEN
    success := false;
    final_status := locked_order.status::TEXT;
    message := 'ORDER_NOT_PAYABLE';
    RETURN NEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = order_id_input) THEN
    UPDATE orders
    SET status = 'inventory_exception',
        notes = 'Paid order has no order_items and requires manual reconciliation.',
        stripe_session_id = stripe_session_id_input,
        stripe_payment_intent_id = stripe_payment_intent_id_input,
        customer_email = COALESCE(customer_email_input, customer_email),
        paid_at = COALESCE(paid_at, NOW()),
        updated_at = NOW()
    WHERE id = order_id_input;

    success := false;
    final_status := 'inventory_exception';
    message := 'ORDER_HAS_NO_ITEMS';
    RETURN NEXT;
    RETURN;
  END IF;

  FOR item_record IN
    SELECT oi.product_id, oi.quantity, p.stock, p.name
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = order_id_input
  LOOP
    IF item_record.product_id IS NULL OR item_record.stock IS NULL OR item_record.stock < item_record.quantity THEN
      UPDATE orders
      SET status = 'inventory_exception',
          notes = 'Stripe payment confirmed, but stock was insufficient for product ' || COALESCE(item_record.name, item_record.product_id::TEXT),
          stripe_session_id = stripe_session_id_input,
          stripe_payment_intent_id = stripe_payment_intent_id_input,
          customer_email = COALESCE(customer_email_input, customer_email),
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
      WHERE id = order_id_input;

      success := false;
      final_status := 'inventory_exception';
      message := 'INSUFFICIENT_STOCK';
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;

  FOR item_record IN
    SELECT oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = order_id_input
  LOOP
    UPDATE products
    SET stock = stock - item_record.quantity,
        updated_at = NOW()
    WHERE id = item_record.product_id
      AND stock >= item_record.quantity;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count = 0 THEN
      UPDATE orders
      SET status = 'inventory_exception',
          notes = 'Stripe payment confirmed, but stock decrement failed during finalization.',
          stripe_session_id = stripe_session_id_input,
          stripe_payment_intent_id = stripe_payment_intent_id_input,
          customer_email = COALESCE(customer_email_input, customer_email),
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
      WHERE id = order_id_input;

      success := false;
      final_status := 'inventory_exception';
      message := 'STOCK_DECREMENT_FAILED';
      RETURN NEXT;
      RETURN;
    END IF;

    INSERT INTO inventory_movements(product_id, order_id, quantity_delta, reason, notes)
    VALUES(item_record.product_id, order_id_input, item_record.quantity * -1, 'sale', 'Stripe payment confirmed');
  END LOOP;

  IF locked_order.coupon_code IS NOT NULL THEN
    UPDATE coupons
    SET current_uses = current_uses + 1,
        updated_at = NOW()
    WHERE code = locked_order.coupon_code
      AND store_id = locked_order.store_id
      AND is_active = true
      AND (max_uses IS NULL OR current_uses < max_uses);
  END IF;

  UPDATE orders
  SET status = 'pagado',
      stripe_session_id = stripe_session_id_input,
      stripe_payment_intent_id = stripe_payment_intent_id_input,
      customer_email = COALESCE(customer_email_input, customer_email),
      paid_at = COALESCE(paid_at, NOW()),
      notes = CASE
        WHEN notes = 'Manually reconciled after Stripe live payment webhook failure.' THEN notes
        ELSE notes
      END,
      updated_at = NOW()
  WHERE id = order_id_input;

  success := true;
  final_status := 'pagado';
  message := 'ORDER_FINALIZED';
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
