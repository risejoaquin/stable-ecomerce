# Execution Pack: CCP-27 — Transactional Email Integration for POS Receipts

## 1. Responsibility
- **Lead Domain**: Backend & Communications Engineering
- **Assignee Lead**: Julian (Backend Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Implement the transactional digital receipt email template in HTML/React Email, integrate receipt enqueuing with the existing PostgreSQL `email_queue`, and update the background queue worker (`email-worker.ts`) to dispatch digital receipts via the Resend API.

## 3. Why
Fulfills **DR-REC-001**. Modern retail customers increasingly request digital receipts emailed to their smartphone. To ensure system reliability, receipt email delivery must execute asynchronously without delaying the cashier or risking a transaction rollback if email services experience latency.

## 4. Owner Profile
Node.js Backend Engineer experienced with transactional email templating (HTML/CSS for email clients), queue worker architectures, and the Resend API.

## 5. Preconditions
- CCP-20 (POS Receipt Read Model) completed.
- Existing email queue infrastructure (`email_queue`, `email-worker.ts`, `email-templates.ts`) inspected.
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md` reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-20.
- **Downstream Blocking**: Blocks post-sale digital receipt delivery in production.

## 7. Authoritative Contracts
- **DR-REC-001 (Receipt & Read Model)**
- `docs/engineering/client-01/11_RECEIPT_CONTRACT.md`
- `docs/engineering/client-01/15_INTEGRATION_STRATEGY.md`

## 8. Scope IN
- HTML/CSS email template `src/emails/PosReceiptEmail.tsx` optimized for mobile and desktop email clients.
- Endpoint `POST /api/pos/orders/:id/email-receipt` enqueuing jobs into `email_queue`.
- Extension of `email-worker.ts` to recognize template type `'pos_receipt'` and dispatch via Resend.
- Enqueue failure isolation: database transaction never rolls back if queue insert encounters transient issues.
- Integration tests verifying template rendering and queue job processing.

## 9. Scope OUT
- Web POS frontend email input dialog (handled in CCP-24).
- Marketing newsletter subscriptions or promotional drip campaigns.
- Inbound email receiving or customer reply parsing.

## 10. Required Behavior
1. Require `owner` or `admin` role to trigger digital receipts via API.
2. Accept recipient email, validate format using Zod.
3. Compute receipt read model using `ReceiptService` (CCP-20).
4. Insert job into `email_queue` with `template = 'pos_receipt'` and receipt payload JSON.
5. Return HTTP `202 Accepted` immediately.
6. Worker polls queue, renders HTML template, and dispatches via Resend API.
7. If Resend fails, record error message and increment `retry_count`.

## 11. Inputs
- HTTP POST request: `orderId` parameter, JSON body `{ "email": "customer@example.com" }`.
- Queue records picked up by `email-worker.ts`.

## 12. Outputs
- HTTP 202 response `{ success: true, message: "Receipt email enqueued successfully", queueId: "..." }`.
- Row inserted into `email_queue`.
- Outgoing transactional email dispatched via Resend.

## 13. Allowed Implementation Freedom
- Visual layout and styling of email template (header logo, brand colors, typography) using Tailwind / inline CSS.
- Worker poll frequency tuning (default 5 seconds).

## 14. Forbidden Changes
- DO NOT execute synchronous Resend API calls inside the POS checkout request lifecycle.
- DO NOT allow an email error to roll back an order or payment transaction.
- DO NOT commit Resend API keys or secrets to the codebase.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/emails/PosReceiptEmail.tsx`
  - `src/services/email-service.ts`
  - `src/workers/email-worker.ts`
  - `src/controllers/pos-receipt-controller.ts`
  - `tests/unit/emails/pos-receipt-email.test.ts`
- **Strictly Prohibited**:
  - Public storefront routes or payment processing webhooks.

## 16. Data Impact
- Inserts new rows into existing `email_queue` table.

## 17. API Impact
- Exposes `POST /api/pos/orders/:id/email-receipt`.

## 18. Security
- Accessible only to authorized staff (`requirePosOperator`).
- Email address sanitized and validated to prevent header injection.

## 19. Concurrency & Idempotency
- Queue worker uses `SELECT ... FOR UPDATE SKIP LOCKED` to prevent duplicate processing by parallel worker instances.

## 20. Migration Considerations
- Uses existing `email_queue` table structure; zero DDL migrations required.

## 21. Edge Cases
- Invalid or bouncing email: Resend returns delivery webhook; worker updates queue status to `failed` without crashing.
- Multiple receipt requests for same order: each request enqueues an independent email dispatch.

## 22. Observability
- Worker logs successful dispatch with `queueId`, `orderId`, and Resend message ID.

## 23. Acceptance Criteria
- [ ] Endpoint enqueues job and returns HTTP 202 in under 50ms.
- [ ] Email template renders correctly across Apple Mail, Gmail, and Outlook clients.
- [ ] Complete line items, order totals, and tender details are clearly visible in the email body.
- [ ] Resend outage does not affect checkout or return error to cashier terminal.

## 24. Test Strategy
- Vitest unit test asserting HTML output of `PosReceiptEmail` template.
- Integration test with mocked Resend API asserting queue worker transitions from `pending` to `sent`.

## 25. Staging Validation
- Trigger receipt email for a staging sale using staff email; verify email arrives in inbox with accurate totals.

## 26. Evidence Requirements
- Passing Vitest execution logs.
- Screenshot of rendered email receipt received in an inbox.

## 27. Definition of Done
- Email template and worker modifications reviewed and tested.
- Resend dispatch verified on staging.
- Ready for CCP-24 UI consumption.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Rogelio (connect email button in Receipt Modal CCP-24).
