# Execution Pack: CCP-23 — Transactional Email Automation — Order Event Notification Trigger Integration

## 1. Responsibility
- **Lead Domain**: Backend Architecture & Communications Infrastructure
- **Assignee Lead**: Rogelio (Backend / Database Lead)
- **Secondary Reviewer**: Julian (Frontend Lead)

## 2. Objective
Wire order lifecycle events (order payment confirmation, shipping fulfillment updates, and `inventory_exception` fulfillment delay notices) into the existing asynchronous email queue (`src/server/email/email-queue.ts`), ensuring that transactional customer emails are queued without blocking HTTP responses, that delivery failures never rollback checkout transactions, and that stock is never mutated by communication logic.

## 3. Why
Fulfills **DR-REC-001** and customer communication requirements. Currently, the Resend email service, queue worker, and templates are implemented in `src/server/email/`, but lifecycle hooks are disconnected. Connecting these triggers ensures customers receive immediate purchase receipts, shipping tracking links, and transparent delay notifications, while maintaining strict architectural decoupling between checkout transactions and third-party network transports.

## 4. Owner Profile
Senior Node.js / Backend Engineer with expertise in event-driven systems, asynchronous message queues, Resend API integrations, and resilient error decoupling.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- CCP-13 (Canonical Orders & Payment Ledger) completed.
- CCP-17 (Resend Webhook Security & Verification) verified.
- Email templates and transport in `src/server/email/` verified intact.

## 6. Dependencies
- **Preceding Tickets**: CCP-13, CCP-17.
- **Downstream Blocking**: Blocks CCP-24 (Order Confirmation & Tracking UI) and CCP-33 (Critical Path E2E Automation).

## 7. Authoritative Contracts
- **DR-REC-001 (Deterministic Receipt Read Model & Decoupled Email Queue)**
- **DR-INV-001 (Canonical Inventory Authority — Sole Mutator)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md`

## 8. Scope IN
- Implementing event emitter / queue insertion triggers:
  1. `order:paid`: Queues `sendOrderConfirmationEmail` with itemized products, quantities, subtotal, tax, and order ID.
  2. `order:shipped`: Queues `sendShippingNotificationEmail` with carrier name and tracking URL.
  3. `order:inventory_exception`: Queues `sendInventoryExceptionDelayEmail` providing reassuring delay notification and support contact.
- Ensuring queue insertion is non-blocking (`enqueueEmailJob(...)` resolves asynchronously or inside post-commit hook).
- Validating that any Resend network timeout or API error is captured in `email_events` with status `'failed'` without rolling back the completed order.
- Unit and integration tests in `tests/server/email-triggers.test.ts`.

## 9. Scope OUT
- Rebuilding or refactoring email templates in `email-templates.ts` (already operational).
- Direct mutation of inventory or order status within email workers.
- Digital thermal receipt generation for physical Web POS registers (handled in CCP-27).

## 10. Required Behavior
1. When an order transitions to `paid` status (via Stripe webhook or POS sale completion), call `emailQueue.enqueue('order_confirmation', payload)`.
2. When an admin updates order fulfillment to `shipped` with tracking metadata, call `emailQueue.enqueue('shipping_update', payload)`.
3. When an order is placed in `inventory_exception` status due to a concurrent stock race, call `emailQueue.enqueue('inventory_exception', payload)`.
4. The background queue worker processes jobs sequentially, calls Resend SDK, updates `email_events`, and retries up to 3 times on transient network failures.
5. If the Resend API is unreachable or returns HTTP 500, the order transaction remains committed and active.

## 11. Inputs
- Order event payloads `{ orderId, customerEmail, orderNumber, items, total, carrier, trackingUrl }`.

## 12. Outputs
- Inserted job records in queue table / memory queue.
- Dispatched emails via Resend API.
- Audit rows logged in `email_events`.

## 13. Allowed Implementation Freedom
- Worker poll interval and retry backoff schedule (e.g. exponential backoff 5s, 30s, 120s).
- In-memory event emitter vs database-backed queue table.

## 14. Forbidden Changes
- DO NOT execute Resend API calls synchronously within the HTTP checkout request handler.
- DO NOT rollback or abort database transactions if email queuing or dispatch fails.
- DO NOT modify inventory tables or trigger stock arithmetic within email handlers.
- DO NOT hardcode Resend API keys in code or commit them to git.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/server/email/email-triggers.ts`
  - `src/server/email/email-queue.ts`
  - Integration hooks in `src/server/pos/pos-controller.ts` and `src/server/orders/`
  - `tests/server/email-triggers.test.ts`
- **Strictly Prohibited**:
  - Frontend components or client-side email triggers.

## 16. Data Impact
- Records email delivery status in `email_events` table.
- Zero modifications to inventory or product tables.

## 17. API Impact
- Internal event triggers only; no external HTTP signature changes.

## 18. Security
- Sanitizes customer names and product descriptions to prevent email header injection (CRLF attacks).
- Customer email addresses handled strictly according to PII protection standards.

## 19. Concurrency & Idempotency
- Queue jobs use deduplication keys `${orderId}_${eventType}` to prevent duplicate email dispatches on re-triggered events.

## 20. Migration Considerations
- None. Integrates with existing database and email queue infrastructure.

## 21. Edge Cases
- Order placed without customer email (e.g. anonymous cash POS sale): queue silently skips customer email dispatch while logging event.
- Resend API outage: jobs remain in queue until service recovers; checkout proceeds unimpeded.

## 22. Observability
- Emits structured log on email queue insertion and dispatch result: `{ "event": "email_queued", "orderId": "...", "template": "order_confirmation" }`.

## 23. Acceptance Criteria
- [ ] Order paid event inserts confirmation job into queue.
- [ ] Shipping fulfillment update inserts shipping notification with tracking URL into queue.
- [ ] Order transitioning to `inventory_exception` inserts customer delay notification into queue.
- [ ] Simulated email dispatch failure does NOT abort or roll back order persistence.
- [ ] Email dispatch logic does not perform stock deduction or inventory mutation.
- [ ] Automated tests in `tests/server/email-triggers.test.ts` pass with 100% green assertions.

## 24. Test Strategy
- Vitest unit tests with mocked Resend client validating event listeners, queue payload validation, retry semantics, and decoupled failure handling.

## 25. Staging Validation
- Create test order on Railway staging, verify that mock/sinkhole email record appears in `email_events` table with correct template and payload.

## 26. Evidence Requirements
- Terminal execution output of `npm test tests/server/email-triggers.test.ts`.
- Query log demonstrating `email_events` entry with status `'sent'` or `'queued'`.

## 27. Definition of Done
- Event hooks wired and tested.
- Code reviewed and approved by Frontend Lead (Julian) and Technical Authority (Joaquin).
- Ready for integration with E2E automation (CCP-33).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Julian (consume in CCP-24 Order Confirmation & Tracking UI) and QA Lead (CCP-33 E2E automation).
