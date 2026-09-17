# Refund Integrity & Critical Functions Hardening — Final Remediation Candidate

DATE: 2026-09-17T16:14:00-07:00
AGENT: Codex / Antigravity
ENVIRONMENT: Local Windows PowerShell, Node v24.14.0, Vite/Vitest
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION
COMMIT: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640 (with server.ts refund validation & test suite)

---

## 1. Executive Summary

Per the architecture decision from ChatGPT Web:
1. **Partial Refunds:** Supported financially; **MUST NOT automatically restock inventory**.
2. **Full Refunds:** May restock the complete order; restock is atomic, idempotent, and tracked at the order level.
3. **Restock Functionality:** Switched from item-level iteration in `server.ts` to a single atomic database function `public.restock_refunded_order(order_id_input UUID)`.
4. **Validation Guard:** Server-side check rejects partial refunds with `restock=true` (`400: "Inventory restock is only supported for full order refunds."`) **before** any Stripe API call is made.
5. **No Production Changes:** The candidate migration has been placed in evidence only and has not been executed on production Supabase.

---

## 2. Server Implementation (Task 1 & Task 6)

In [`server.ts`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce/server.ts#L2277-L2325), the refund handler `POST /api/admin/orders/:id/refund` was updated:

```typescript
    const newRefundedAmount = Number((alreadyRefunded + requestedAmount).toFixed(2));
    const isFullRefund = newRefundedAmount >= orderTotal;

    // Task 1: Reject partial refund with restock BEFORE creating Stripe refund
    if (restock === true && !isFullRefund) {
      return res.status(400).json({ error: 'Inventory restock is only supported for full order refunds.' });
    }

    const paymentIntentId = order.stripe_payment_intent_id || getPaymentIntentId(await stripe.checkout.sessions.retrieve(order.stripe_session_id));
    if (!paymentIntentId) return res.status(400).json({ error: 'No payment intent found' });

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: moneyToCents(requestedAmount),
      reason: ['duplicate', 'fraudulent', 'requested_by_customer'].includes(reason) ? reason : 'requested_by_customer',
      metadata: {
        order_id: id,
        store_slug: PRIMARY_STORE_SLUG
      }
    } as any);

    const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';
    const updatePayload: any = {
      status: newStatus,
      refunded_amount: newRefundedAmount,
      stripe_refund_id: refund.id,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single();
    if (updateError) throw updateError;

    // Task 6: Atomic order-level restock with error checking
    if (restock === true && isFullRefund) {
      const { data: restockResult, error: restockError } = await supabase.rpc('restock_refunded_order', {
        order_id_input: id
      });
      if (restockError) {
        logger.error({ err: restockError, orderId: id }, 'Refund restock failed');
        throw restockError;
      }
      logger.info({ orderId: id, restockResult }, 'Order restocked successfully');
    }
```

---

## 3. Database Migration Candidate (Task 2, 3, 4, 5, 9)

Ubicación del archivo:
[`AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce/AGENT_CONTEXT/evidence/block-c/2026-09-17-supabase-security-remediation-candidate.sql)

### 3.1 Schema Extension (Task 3)
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_restocked_at TIMESTAMPTZ NULL;
```

### 3.2 Obsolete Functions Drop (Task 5)
```sql
DROP FUNCTION IF EXISTS public.decrement_stock(UUID, INT);
DROP FUNCTION IF EXISTS public.consume_coupon_after_payment(TEXT, UUID);
```
*(Note: `restock_refunded_item` is NOT created).*

### 3.3 Hardened `finalize_paid_order` (Task 4)
- Configured with `SECURITY INVOKER`, `SET search_path = ''`.
- All relations schema-qualified (`public.orders`, `public.order_items`, `public.products`, `public.inventory_movements`, `public.coupons`, `public.orders%ROWTYPE`).
- Permissions:
  ```sql
  REVOKE ALL ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) FROM anon;
  REVOKE ALL ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.finalize_paid_order(UUID, TEXT, TEXT, TEXT) TO service_role;
  ```

### 3.4 Atomic `restock_refunded_order` (Task 2)
```sql
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

  -- Idempotency guard:
  IF v_order.inventory_restocked_at IS NOT NULL THEN
    RETURN QUERY SELECT true, 'ALREADY_RESTOCKED'::TEXT;
    RETURN;
  END IF;

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
```

---

## 4. Test Suite Coverage (Task 7 & Task 8)

File: [`tests/security/critical-functions-security.test.ts`](file:///C:/Users/Lucilfer/Documents/Stable-Ecommerce/tests/security/critical-functions-security.test.ts)

**Task 7 Idempotency & Refund Integrity (Tests 1-8):**
1. Partial refund + `restock=true` is rejected before Stripe call (`400: Inventory restock is only supported for full order refunds.`).
2. Partial refund + `restock=false` proceeds normally.
3. Full refund + `restock=true` calls order-level RPC `restock_refunded_order`.
4. Second restock attempt returns `ALREADY_RESTOCKED` and does not increase stock twice.
5. Missing RPC / error causes request failure and throws.
6. `inventory_restocked_at` column is present and set on restock.
7. Inventory movements are inserted with reason `'refund'`.
8. Full refund without restock does not invoke restock RPC.

**Task 8 Security Migration Contract (Tests 9-15):**
9. `anon` cannot execute `finalize_paid_order`.
10. `authenticated` cannot execute `finalize_paid_order`.
11. `service_role` can execute `finalize_paid_order` with `SECURITY INVOKER` and `SET search_path = ''`.
12. `anon` cannot execute `restock_refunded_order`.
13. `authenticated` cannot execute `restock_refunded_order`.
14. `service_role` can execute `restock_refunded_order` with `SECURITY INVOKER` and `SET search_path = ''`.
15. Obsolete functions `decrement_stock` and `consume_coupon_after_payment` are dropped.

---

## 5. Quality Gate Verification (Task 10)

- `npm run lint`: **PASS** (`tsc --noEmit` exited with 0).
- `npm test`: **PASS** (17/17 tests passing across 3 test suites).
- `npm run build`: **PASS** (Vite + esbuild bundle generated cleanly).
- `npm run qa:release` (`validate-release.ps1`): **PASS**:
  - TypeScript: PASS
  - Unit Tests: PASS (17 tests)
  - Build: PASS
  - Secret Scan: PASS
  - Resend Webhook Security: PASS
  - Legacy Upload Authorization: PASS
  - Security Baseline Report: PASS
  - Core Regression: PASS (4/4)
  - RELEASE FINAL RESULT: PASS
- `git diff --check`: **PASS** (clean formatting).
