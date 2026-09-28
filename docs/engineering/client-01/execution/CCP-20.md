# Execution Pack: CCP-20 — POS Receipt Generation & Read Model

## 1. Responsibility
- **Lead Domain**: Backend / Read Model Architecture
- **Assignee Lead**: Julian (Backend Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Implement the deterministic receipt read model generator and the backend endpoint `GET /api/pos/orders/:id/receipt`, calculating complete receipt data exclusively from persisted database entities (`orders`, `order_items`, `sellable_units`, `order_payments`).

## 3. Why
Fulfills **DR-REC-001**. Physical and digital receipts must be deterministically reproducible at any point in the future. Decoupling the receipt read model from mutable application state ensures legal and commercial auditability.

## 4. Owner Profile
Node.js / TypeScript Backend Engineer experienced in CQRS read models, currency formatting, and internationalization standards.

## 5. Preconditions
- CCP-13 (Canonical Orders & Payment Ledger) completed.
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-13.
- **Downstream Blocking**: Blocks CCP-24 (POS Receipt View & Print Action) and CCP-27 (Transactional Email Receipts).

## 7. Authoritative Contracts
- **DR-REC-001 (Receipt & Read Model)**
- **DR-AUTH-001 (Authorization Model)**
- **DR-ERR-001 (Standard Error Envelope)**
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md`

## 8. Scope IN
- Receipt generator service `src/services/receipt-service.ts`.
- Endpoint `GET /api/pos/orders/:id/receipt`.
- Formatting of Mexican currency (`$XX.XX MXN`) and localized timezone (`America/Mexico_City`).
- Line item summation, discount breakdowns, and tender details extraction.
- Unit tests validating receipt calculation against varied order configurations.

## 9. Scope OUT
- Browser thermal printing CSS (handled in CCP-24).
- Resend email template rendering (handled in CCP-27).
- PDF generation libraries (browser printing is used instead).

## 10. Required Behavior
1. Enforce `requirePosOperator` (`owner` or `admin`).
2. Fetch order by ID along with its associated items and payment rows.
3. Compute formatted currency strings and dates deterministically.
4. Extract cashier name from `users` table via `orders.cashier_user_id`.
5. Return JSON conforming strictly to the schema in `11_RECEIPT_CONTRACT.md`.

## 11. Inputs
- HTTP GET parameter: `id` (Order UUID).

## 12. Outputs
- HTTP 200 OK: Complete `ReceiptReadModel` JSON object.
- HTTP 404: `ORDER_NOT_FOUND` if order does not exist.

## 13. Allowed Implementation Freedom
- Internal formatting utilities in `src/utils/currency-helpers.ts` and `src/utils/date-helpers.ts`.
- Receipt number sequence formatting (e.g. `REC-YYYYMMDD-XXXX`).

## 14. Forbidden Changes
- DO NOT query external services (e.g. Stripe API) during receipt generation; use persisted database ledger values only.
- DO NOT alter order or payment data during receipt computation (pure read operation).

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/services/receipt-service.ts`
  - `src/controllers/pos-receipt-controller.ts`
  - `src/routes/pos-routes.ts`
  - `src/types/receipt.ts`
  - `tests/unit/services/receipt-service.test.ts`
- **Strictly Prohibited**:
  - Frontend code in `src/pages/*`.

## 16. Data Impact
- Pure read queries joining `orders`, `order_items`, `sellable_units`, `order_payments`, and `users`.

## 17. API Impact
- Exposes `GET /api/pos/orders/:id/receipt`.

## 18. Security
- Accessible only to authorized staff (`requirePosOperator`).
- Zero sensitive card numbers or CVVs exposed (only sanitized `last4` if present).

## 19. Concurrency & Idempotency
- Pure read-only operation. Naturally idempotent.

## 20. Migration Considerations
- Supports generating receipts for historical orders backfilled in CCP-13.

## 21. Edge Cases
- Order with multiple payment rows (future split tender): renders all tender lines clearly.
- Order where customer email is null: gracefully displays "Venta Mostrador (Walk-in Customer)".

## 22. Observability
- Standard structured logging on endpoint invocation.

## 23. Acceptance Criteria
- [ ] Returns 404 `ORDER_NOT_FOUND` for non-existent UUID.
- [ ] Financial totals match order totals to 2 decimal places.
- [ ] Formatted dates strictly reflect `America/Mexico_City` timezone.
- [ ] Cash payments correctly display amount tendered and change given.

## 24. Test Strategy
- Vitest unit tests verifying receipt generator calculations with mock database records.

## 25. Staging Validation
- Fetch receipt for an existing staging order via curl; assert output fields against database record.

## 26. Evidence Requirements
- Passing unit test execution logs.
- Formatted sample receipt JSON output.

## 27. Definition of Done
- Unit tests pass with 100% coverage on financial arithmetic.
- Code reviewed and approved by Architecture Lead.
- Ready for CCP-24 UI consumption.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Rogelio (consume read model in Receipt UI CCP-24).
