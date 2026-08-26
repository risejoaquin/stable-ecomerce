-- Selfcare Sinners - Payment and Order Integrity Migration
-- Safe to run after 001_selfcare_sinners_production_schema.sql.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10,2) DEFAULT 0 CHECK (refunded_amount >= 0),
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

ALTER TABLE stripe_events
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON stripe_events(processed_at);

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

    RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'ORDER_HAS_NO_ITEMS'::TEXT;
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

      RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'INSUFFICIENT_STOCK'::TEXT;
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

      RETURN QUERY SELECT false, 'inventory_exception'::TEXT, 'STOCK_DECREMENT_FAILED'::TEXT;
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
      updated_at = NOW()
  WHERE id = order_id_input;

  RETURN QUERY SELECT true, 'pagado'::TEXT, 'ORDER_FINALIZED'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS restock_refunded_item(UUID, INT, UUID);
CREATE OR REPLACE FUNCTION restock_refunded_item(
  product_id_input UUID,
  quantity_input INT,
  order_id_input UUID
)
RETURNS VOID AS $$
BEGIN
  IF quantity_input <= 0 THEN
    RAISE EXCEPTION 'quantity_input must be greater than zero';
  END IF;

  UPDATE products
  SET stock = stock + quantity_input,
      updated_at = NOW()
  WHERE id = product_id_input;

  INSERT INTO inventory_movements(product_id, order_id, quantity_delta, reason, notes)
  VALUES(product_id_input, order_id_input, quantity_input, 'refund', 'Admin refund restock');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
