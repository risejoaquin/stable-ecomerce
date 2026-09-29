# Execution Pack: CCP-30 — Observability & Structured Logging Integration

**Ticket ID**: `CCP-30`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Role / Owner Profile**: Backend / Site Reliability Engineer (SRE)
**Target Delivery**: Pre-Hardening
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)

---

## 1. Objective, Context & Why

### Objective
Implement end-to-end structured logging with Pino, request correlation tracking via `x-request-id`, Sentry exception reporting, and operational readiness probes across all storefront and Web POS endpoints, ensuring that every financial and inventory operation is fully auditable.

### Why This Matters
In a high-throughput retail environment, POS cash and card transactions must be traceable from the browser UI down to database row-level locks. Without deterministic correlation IDs and structured JSON logs, diagnosing race conditions, payment discrepancies, or inventory allocation failures in production is slow and error-prone.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Every incoming HTTP request must be tagged with a unique UUID correlation ID (`x-request-id`), echoed in the response header.
   - PII and financial credentials (PAN, CVV, passwords, Stripe secret keys) must be automatically redacted.
   - Sentry must capture unhandled 5xx exceptions on server and client with request correlation context.

2. **FROZEN CONTRACT**:
   - `DR-ERR-001`: All error logs must capture the canonical error code and matching `requestId`.
   - `DR-PAY-001`: Payment lifecycle events must emit structured logs containing `orderId`, `channel`, and `amountCents`.

3. **DERIVED ENGINEERING DESIGN**:
   - Pino JSON logging format adhering to `OBSERVABILITY_BASELINE.md`.
   - Deep readiness probe (`GET /api/readiness`) verifying DB, Stripe, email, and environment variables.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Pino-pretty formatting in development mode.

---

## 3. Scope Boundaries

- **IN SCOPE**:
  - Request ID injection middleware (`crypto.randomUUID()`) in `server.ts`.
  - `pino-http` configuration with customProps mapping `requestId`.
  - Structured audit logging helper (`writeAuditLog`) for POS and order events.
  - Deep dependency check implementation in `GET /api/readiness`.
  - Automated tests asserting log structure and sensitive data redaction.
- **EXPLICITLY OUT OF SCOPE**:
  - Migrating to third-party log aggregation SaaS (Datadog, New Relic).
  - Client-side session replay or intrusive DOM tracking.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: `CCP-16` (CI Quality Gate).
- **Downstream Dependents**: `CCP-14` (Web POS Sales API), `CCP-33` (POS E2E Test Suite), `CCP-35` (Staging Verification).
- **Preconditions**:
  - `pino`, `pino-http`, and `@sentry/node` installed in `package.json`.
  - Express middleware pipeline available in `server.ts`.

---

## 5. Step-by-Step Implementation & Verification Guide

```
[Incoming Request to /api/pos/sales]
                 │
                 ▼
[Step 1: Correlation ID Middleware] ──> Read or generate x-request-id -> Attach to req & res
                 │
                 ▼
[Step 2: Pino HTTP Logging]         ──> Log request method, path, client IP
                 │
                 ▼
[Step 3: Route Execution]           ──> POS sales handler runs -> Emits domain audit event
                 │
                 ▼
[Step 4: Error Handling Guard]      ──> If error occurs -> Sentry.captureException + Pino error
                 │
                 ▼
[Step 5: Response Emitted]          ──> Returns response with x-request-id header + status
```

### Verification Commands:

1. **Verify Liveness and Request ID Reflection**:
   ```bash
   curl -i "http://localhost:3000/api/health"
   ```
   **Expected**:
   - Response contains header: `x-request-id: <uuid>`.
   - Response body JSON contains `"requestId": "<uuid>"`.

2. **Verify Readiness Dependency Checks**:
   ```bash
   curl -s "http://localhost:3000/api/readiness" | jq .
   ```
   **Expected**:
   - `checks.env.ok: true`
   - `checks.supabase.ok: true`
   - `checks.stripe.ok: true`
   - `checks.email.ok: true`

3. **Verify Automated API Health & Observability Tests**:
   ```powershell
   npm test tests/api/health.test.ts
   ```

4. **Verify Secret Redaction in Logger**:
   Run the sensitive data redaction unit test:
   ```powershell
   npm test tests/security/audit-01a-data-minimization.test.ts
   ```

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Metric | Verification Method | Pass Threshold | Fail Threshold |
| :--- | :--- | :--- | :--- |
| **Log Format** | Inspection of stdout | Valid single-line JSON; includes `time`, `level`, `requestId`, `msg` | Non-JSON text; missing `requestId` |
| **Correlation Header** | `curl -I /api/health` | `x-request-id` present in HTTP response headers | Missing header |
| **Readiness Latency** | `curl /api/readiness` | Latency < 250ms; status `ready` | Latency > 1000ms or status `degraded` |
| **Data Redaction** | Test payload with password | Value replaced with `[REDACTED]` | Raw password string appears in stdout |

---

## 7. Required Verifiable Evidence

1. **Stdout Log Sample**:
   ```json
   {"level":30,"time":1789684601858,"requestId":"c7a10f82-2b1d-4f62-8e11-9a1b8e45a2b1","method":"POST","url":"/api/pos/sales","statusCode":201,"responseTime":138.4,"msg":"POS sale completed successfully"}
   ```
2. **Readiness Probe Response**:
   Verified JSON payload from `/api/readiness` with all 4 subsystems reporting `ok: true`.
3. **Vitest Execution Output**:
   Green test runner report for `tests/api/health.test.ts`.

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] Every request receives and propagates `x-request-id`.
- [ ] Pino structured logging captures all HTTP requests with response time and status.
- [ ] Redaction guards verified for passwords, tokens, and payment numbers.
- [ ] Sentry captures unhandled exceptions with attached request correlation metadata.
- [ ] `/api/readiness` accurately reflects database, stripe, and email connectivity.

### Escalation Pathway:
- If Supabase probe exhibits latency > 500ms, escalate to Database Engineer.
- If Sentry DSN configuration fails, escalate to DevOps / SRE Lead.
