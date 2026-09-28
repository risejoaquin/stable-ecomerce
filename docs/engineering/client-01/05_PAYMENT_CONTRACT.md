# Payment Ledger Contract & Schema (DR-PAY-001)

## 1. Architectural Contract Specification

| Contract Identifier | Classification | Scope | Authoritative Source |
| :--- | :--- | :--- | :--- |
| **DR-PAY-001** | **FROZEN CONTRACT** | Global / Omnichannel | Repository Architecture Freeze |

### Invariant Rules:
1. **Canonical Payment Authority**: The database table `order_payments` is the exclusive transactional ledger for all monetary transfers associated with orders.
2. **Channel Separation**: Supported payment channels are strictly:
   - `'stripe'`: Online customer payments processed via Stripe Checkout Sessions and webhooks.
   - `'cash'`: In-store physical currency collected by a POS cashier.
   - `'card_reference'`: In-store physical card transaction processed on an external, non-integrated terminal, verified via manual entry of the terminal transaction reference / approval code.
3. **No Synthetic Identifiers**: Under **no circumstances** shall the system synthesize fake Stripe IDs (e.g. `pi_cash_123` or `ch_fake_pos`) for cash or card reference payments. Doing so violates financial auditability and Stripe terms.
4. **Independent Payment Ledger**: An order has a 1-to-many relationship (`order` 1:N `order_payments`). While split tender (e.g. paying half cash, half card) is out of scope for Client 01 MVP, the schema and database architecture must natively support multiple payment ledger rows per order.
5. **Ledger Reconciliation Invariant**: An order cannot be marked `pagado` unless:
   $$\sum \text{amount}(\text{order\_payments where status = 'captured'}) \ge \text{orders.total}$$

---

## 2. Database Schema DDL

```sql
-- Migration: Create Canonical order_payments Table

DO $$ BEGIN
  CREATE TYPE payment_channel_type AS ENUM ('stripe', 'cash', 'card_reference');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_type AS ENUM ('pending', 'captured', 'failed', 'partially_refunded', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_channel TEXT NOT NULL CHECK (payment_channel IN ('stripe', 'cash', 'card_reference')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'mxn' CHECK (currency IN ('mxn', 'usd')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'partially_refunded', 'refunded')),
  idempotency_key TEXT NOT NULL UNIQUE,
  reference_code TEXT, -- External terminal approval/ref code or Stripe PaymentIntent ID
  tender_details JSONB DEFAULT '{}'::jsonb, -- e.g. amountTendered, changeGiven, last4, cardBrand
  refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_refund_limit CHECK (refunded_amount <= amount)
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_channel ON order_payments(payment_channel);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
CREATE INDEX IF NOT EXISTS idx_order_payments_ref_code ON order_payments(reference_code) WHERE reference_code IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Customers can view payments for their own orders
CREATE POLICY "Customers view own order payments" ON order_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_payments.order_id AND orders.customer_user_id = auth.uid()
    )
  );

-- Staff can view and manage all payments
CREATE POLICY "Staff manage order payments" ON order_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin')
    )
  );
```

---

## 3. Tender Details Specification

The `tender_details` JSONB column stores structured metadata specific to the tender type:

### 3.1 Cash Tender (`payment_channel = 'cash'`)
```json
{
  "tenderType": "cash",
  "amountTendered": 1000.00,
  "changeGiven": 150.00,
  "notes": "Collected in register drawer 1"
}
```
- **Validation Rules**: `amountTendered` must be $\ge amount$. `changeGiven` must strictly equal $\text{amountTendered} - amount$.

### 3.2 External Card Reference (`payment_channel = 'card_reference'`)
```json
{
  "tenderType": "card_reference",
  "referenceCode": "AUTH-984210",
  "terminalId": "TERM-MAIN-01",
  "cardBrand": "Mastercard",
  "last4": "4242",
  "notes": "Physical terminal receipt #5512"
}
```
- **Validation Rules**: `referenceCode` is mandatory, minimum 4 alphanumeric characters, trimmed of whitespace.

### 3.3 Stripe (`payment_channel = 'stripe'`)
```json
{
  "tenderType": "stripe",
  "stripeSessionId": "cs_live_a1b2c3...",
  "stripePaymentIntentId": "pi_3MtwLw2eZvKYlo2C01234567",
  "paymentMethodType": "card",
  "last4": "1234",
  "cardBrand": "visa"
}
```

---

## 4. Ledger Reconciliation & Integrity Check

A PostgreSQL verification query ensures zero financial discrepancy:

```sql
CREATE OR REPLACE FUNCTION verify_order_payment_reconciliation(order_id_input UUID)
RETURNS TABLE (
  order_id UUID,
  order_total DECIMAL(10,2),
  captured_total DECIMAL(10,2),
  is_balanced BOOLEAN,
  discrepancy DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS order_id,
    o.total AS order_total,
    COALESCE(SUM(p.amount), 0.00) AS captured_total,
    (o.total = COALESCE(SUM(p.amount), 0.00)) AS is_balanced,
    (COALESCE(SUM(p.amount), 0.00) - o.total) AS discrepancy
  FROM orders o
  LEFT JOIN order_payments p ON p.order_id = o.id AND p.status = 'captured'
  WHERE o.id = order_id_input
  GROUP BY o.id, o.total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. TypeScript Interface Definition

```typescript
export type PaymentChannel = 'stripe' | 'cash' | 'card_reference';

export type PaymentStatus = 
  | 'pending'
  | 'captured'
  | 'failed'
  | 'partially_refunded'
  | 'refunded';

export interface CashTenderDetails {
  tenderType: 'cash';
  amountTendered: number;
  changeGiven: number;
  notes?: string;
}

export interface CardReferenceTenderDetails {
  tenderType: 'card_reference';
  referenceCode: string;
  terminalId?: string;
  cardBrand?: string;
  last4?: string;
  notes?: string;
}

export interface StripeTenderDetails {
  tenderType: 'stripe';
  stripeSessionId: string;
  stripePaymentIntentId: string;
  paymentMethodType?: string;
  last4?: string;
  cardBrand?: string;
}

export type TenderDetails = CashTenderDetails | CardReferenceTenderDetails | StripeTenderDetails;

export interface OrderPaymentRecord {
  id: string;
  orderId: string;
  paymentChannel: PaymentChannel;
  amount: number;
  currency: 'mxn' | 'usd';
  status: PaymentStatus;
  idempotencyKey: string;
  referenceCode?: string;
  tenderDetails: TenderDetails;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
}
```
