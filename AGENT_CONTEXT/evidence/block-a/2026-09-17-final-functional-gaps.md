# QA / RELEASE E — Block A Final Functional Regression Evidence

**Date:** 2026-09-17  
**Scope:** QA / RELEASE E — Block A Functional Regression Closure (Orders, Email Flows, Authorization Matrix, Refund Contract)  
**Branch:** `main`  
**Base Commit:** `bcd82ff2fd1f6d94d0b239d3f87897b53ce3168e`  
**Status:** READY_FOR_CHATGPT_WEB_VALIDATION  

---

## 1. Executive Summary

Block A functional regression gaps have been systematically addressed and verified using automated API contracts in `tests/api/functional-quality-contracts.test.ts` without touching production databases, Stripe live credentials, or Supabase schemas:
- **Task 1 (Orders):** Customer order list (`/api/orders/my`), tracking parameter validation and nonexistent order 404 response (`/api/orders/track`), guest denial (401), non-admin denial (403), and admin access (`/api/admin/orders`, `/api/admin/orders/:id`) verified.
- **Task 2 (Email Flows):** Resend webhook signature verification (`/api/webhooks/resend`), Svix headers enforcement, invalid signature rejection, unconfigured provider error handling, and admin resend confirmation contract (`/api/admin/orders/:id/resend-confirmation`) verified.
- **Task 3 (Authorization Matrix):** 5 sensitive endpoints verified across guest (401), authenticated non-admin (403), and admin (authorized) boundaries.
- **Task 4 (Refund Contract):** Mock Stripe and PostgREST contract verifying negative/zero amount rejection (400), amount exceeding refundable total rejection (400), partial refund with `restock=true` rejection (400) before any Stripe call, and unauthorized caller rejection (401/403).

All 44 automated API contract tests pass deterministically in 2.28s.

---

## 2. Test Execution & Evidence

### Test Command
```powershell
npx vitest run tests/api/functional-quality-contracts.test.ts
```

### Test Results
- **Exit Code:** 0
- **Duration:** 2.91s
- **Suites:** 1 passed (1 total)
- **Tests:** 44 passed (44 total)

```text
 ✓ tests/api/functional-quality-contracts.test.ts (44 tests) 2277ms
   ✓ TASK 1 — Orders Contract Tests (11 tests)
     ✓ denies guest access to customer order list with 401
     ✓ allows authenticated customer to access their own order list
     ✓ rejects order tracking when required query parameters are missing
     ✓ rejects order tracking when only email is provided without order_id
     ✓ rejects order tracking when only order_id is provided without email
     ✓ returns error or 404 for tracking nonexistent order without leaking data
     ✓ denies guest access to admin orders list with 401
     ✓ denies non-admin user access to admin orders list with 403
     ✓ allows admin token to query admin orders endpoint
     ✓ denies guest access to admin order detail with 401
     ✓ denies non-admin user access to admin order detail with 403
   ✓ TASK 2 — Email Flows Contract Tests (4 tests)
     ✓ denies guest access to admin resend confirmation with 401
     ✓ denies non-admin user access to admin resend confirmation with 403
     ✓ enforces Resend webhook signature verification headers
     ✓ rejects Resend webhook with invalid svix signature headers
   ✓ TASK 3 — Sensitive Endpoints Authorization Matrix (15 tests)
     ✓ enforces guest denial (401) on admin diagnostics
     ✓ enforces non-admin user denial (403) on admin diagnostics
     ✓ allows admin token to pass authorization gate on admin diagnostics
     ✓ enforces guest denial (401) on admin orders list
     ✓ enforces non-admin user denial (403) on admin orders list
     ✓ allows admin token to pass authorization gate on admin orders list
     ✓ enforces guest denial (401) on legacy upload
     ✓ enforces non-admin user denial (403) on legacy upload
     ✓ allows admin token to pass authorization gate on legacy upload
     ✓ enforces guest denial (401) on admin refund
     ✓ enforces non-admin user denial (403) on admin refund
     ✓ allows admin token to pass authorization gate on admin refund
     ✓ enforces guest denial (401) on admin resend confirmation
     ✓ enforces non-admin user denial (403) on admin resend confirmation
     ✓ allows admin token to pass authorization gate on admin resend confirmation
   ✓ TASK 4 — Refund Contract Tests (6 tests)
     ✓ denies guest caller from executing refunds with 401
     ✓ denies authenticated non-admin caller from executing refunds with 403
     ✓ rejects refund request with negative amount (400)
     ✓ rejects refund request with zero amount (400)
     ✓ rejects refund request exceeding order refundable total (400)
     ✓ rejects partial refund when restock=true before calling Stripe (400)
   ✓ TASK 6 — Rate Limiting Inspection (3 tests)
     ✓ mounts rate limiter on checkout route and exposes rate limit headers
     ✓ mounts rate limiter on contact route
     ✓ enforces email sensitive limiter on forgot-password
   ✓ TASK 7 — Input Validation (5 tests)
     ✓ rejects checkout with missing orderId
     ✓ rejects authentication with missing credentials
     ✓ rejects authentication with empty string credentials
     ✓ rejects order tracking with missing parameters
     ✓ rejects contact submission with missing required fields
```

---

## 3. Detailed Contract Analysis

### Task 1: Orders
1. **Order List (`GET /api/orders/my`):**
   - Guest caller (`Authorization` missing) -> 401 `Unauthorized`.
   - Authenticated customer -> 200 with order array scoped to `customer_user_id`.
2. **Order Tracking (`GET /api/orders/track`):**
   - Missing query parameters -> 400 `Email and order_id required`.
   - Partial parameters (email only or order_id only) -> 400 `Email and order_id required`.
   - Nonexistent order lookup -> 404 `Order not found` without exposing internal database errors or uncoerced PostgREST single-object errors (HOTFIX D1 contract preserved).
3. **Admin Orders Access (`GET /api/admin/orders`, `GET /api/admin/orders/:id`):**
   - Guest caller -> 401 `Unauthorized`.
   - Authenticated non-admin caller -> 403 `Admin access required`.
   - Admin caller -> 200 with paginated order list.

### Task 2: Email Flows
1. **Admin Resend Confirmation (`POST /api/admin/orders/:id/resend-confirmation`):**
   - Protected by `requireAuth()`, `requireAdmin()`, and `adminEmailLimiter` (10 per 10min).
   - Guest rejected with 401, non-admin rejected with 403.
2. **Resend Webhook Security (`POST /api/webhooks/resend`):**
   - Evaluated before `express.json()` with `express.raw({ type: 'application/json' })`.
   - Missing Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) -> 400 `Invalid webhook signature`.
   - Invalid signature headers -> 400 `Invalid webhook signature`.
   - Unconfigured webhook secret -> 500 `Webhook verification not configured`.

### Task 3: Sensitive Endpoints Authorization Matrix

| Endpoint | Method | Guest (No Token) | Non-Admin (`role: user`) | Admin (`role: admin`) |
|---|---|---|---|---|
| `/api/admin/diagnostics` | GET | 401 Unauthorized | 403 Admin access required | Allowed (Auth pass) |
| `/api/admin/orders` | GET | 401 Unauthorized | 403 Admin access required | Allowed (Auth pass) |
| `/api/upload` | POST | 401 Unauthorized | 403 Admin access required | Allowed (Auth pass) |
| `/api/admin/orders/:id/refund` | POST | 401 Unauthorized | 403 Admin access required | Allowed (Auth pass) |
| `/api/admin/orders/:id/resend-confirmation` | POST | 401 Unauthorized | 403 Admin access required | Allowed (Auth pass) |

### Task 4: Refund Contract Integrity
1. **Authorization Gate:**
   - Guest caller -> 401 Unauthorized.
   - Authenticated non-admin caller -> 403 Admin access required.
2. **Validation Rules (Evaluated BEFORE calling Stripe):**
   - Negative amount (`amount: -15`) -> 400 `Refund amount must be greater than zero`.
   - Zero amount (`amount: 0`) -> 400 `Refund amount must be greater than zero`.
   - Amount exceeding refundable total (`amount: 250` for $100 order) -> 400 `Refund amount exceeds remaining refundable total`.
   - Partial refund with `restock: true` (`amount: 50, restock: true`) -> 400 `Inventory restock is only supported for full order refunds.`.
3. **Full Restock Contract:**
   - Full refund with `restock: true` calls database RPC `public.restock_refunded_order(order_id_input)`.
   - Repeat calls prevented by `orders.inventory_restocked_at` timestamp.
