-- Offline, explicit operator execution only. No fabricated provider identifiers.
-- Capture all fulfilled/paid and refunded history, including guests. Unknown
-- partial refunds fail closed instead of inventing financial evidence.
BEGIN;
LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.order_payments IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE o public.orders%ROWTYPE; refund numeric(10,2); payment_status text; key text;
BEGIN
  FOR o IN SELECT * FROM public.orders WHERE channel = 'web_storefront'
    AND status IN ('pagado','empacado','enviado','entregado','inventory_exception','partially_refunded','refunded') ORDER BY id
  LOOP
    IF o.total <= 0 OR o.total = 'NaN'::numeric OR o.currency IS NULL OR o.currency NOT IN ('mxn','usd') THEN
      RAISE EXCEPTION 'BACKFILL_INVALID_PAID_ORDER' USING DETAIL = 'order_id=' || o.id;
    END IF;
    refund := COALESCE(o.refunded_amount,0);
    IF refund < 0 OR refund > o.total OR refund = 'NaN'::numeric OR
      (o.status = 'partially_refunded' AND (refund <= 0 OR refund >= o.total)) OR
      (o.status = 'refunded' AND refund <> o.total) THEN
      RAISE EXCEPTION 'BACKFILL_REFUND_EVIDENCE_REQUIRED' USING DETAIL = 'order_id=' || o.id;
    END IF;
    payment_status := CASE WHEN refund = o.total THEN 'refunded' WHEN refund > 0 THEN 'partially_refunded' ELSE 'captured' END;
    key := 'legacy-order-payment:' || o.id;
    IF EXISTS (SELECT 1 FROM public.order_payments WHERE order_id = o.id OR idempotency_key = key) THEN
      IF NOT EXISTS (SELECT 1 FROM public.verify_order_payment_reconciliation(o.id) WHERE is_balanced) THEN
        RAISE EXCEPTION 'BACKFILL_EXISTING_LEDGER_MISMATCH' USING DETAIL = 'order_id=' || o.id;
      END IF;
      CONTINUE;
    END IF;
    INSERT INTO public.order_payments(order_id,payment_channel,amount,currency,status,idempotency_key,
      reference_code,tender_details,refunded_amount,created_at)
    VALUES(o.id,'stripe',o.total,o.currency,payment_status,key,NULLIF(btrim(o.stripe_payment_intent_id),''),
      jsonb_strip_nulls(jsonb_build_object('tenderType','stripe',
        'stripeSessionId',NULLIF(btrim(o.stripe_session_id),''),
        'stripePaymentIntentId',NULLIF(btrim(o.stripe_payment_intent_id),''),
        'historicalBackfill',true)),refund,COALESCE(o.paid_at,o.created_at,now()));
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.orders history CROSS JOIN LATERAL public.verify_order_payment_reconciliation(history.id) r
    WHERE history.channel = 'web_storefront' AND history.status IN ('pagado','empacado','enviado','entregado','inventory_exception','partially_refunded','refunded')
      AND NOT r.is_balanced) THEN RAISE EXCEPTION 'BACKFILL_RECONCILIATION_FAILED'; END IF;
END;
$$;
SELECT o.id,r.* FROM public.orders o CROSS JOIN LATERAL public.verify_order_payment_reconciliation(o.id) r
  WHERE o.channel = 'web_storefront' AND o.status IN ('pagado','empacado','enviado','entregado','inventory_exception','partially_refunded','refunded');
COMMIT;
