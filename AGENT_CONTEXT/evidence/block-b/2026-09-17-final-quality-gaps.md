# QA / RELEASE E — Block B Final Quality & Experience Evidence

**Date:** 2026-09-17  
**Scope:** QA / RELEASE E — Block B Quality & Experience Closure & SEC-005 Login Rate Limiting Hotfix  
**Branch:** `main`  
**Base Commit:** `585e8b4baa5942c34bbfa0a1f81e6cf4a016acbb`  
**Status:** READY_FOR_CHATGPT_WEB_VALIDATION  

---

## 1. Executive Summary

Block B quality, experience, and resilience gaps have been closed and verified through expanded automated accessibility audits, rate limiter mounting inspection, input validation boundaries, multi-viewport regression, and the remediation of **SEC-005 (Login Dedicated Rate Limiting)**:
- **SEC-005 (Login Rate Limiter):** Dedicated IP-based rate limiter implemented on `POST /api/login` executing before input validation and bcrypt credential verification.
- **Task 5 (Accessibility Audits):** Extended AxeBuilder (`@axe-core/playwright`) WCAG 2.0 A & AA audits across 6 core application surfaces (Home, PDP, Sign-in, Cart Drawer, Track, Admin) with **0 critical violations**.
- **Task 6 (Rate Limiting Verification):** All 7 sensitive endpoints verified as rate-limited: checkout, orders, contact, forgot-password, resend-verification, admin resend-confirmation, and login.
- **Task 7 (Input Validation):** Verified rejection of malformed or missing payloads on checkout, authentication, tracking, contact form, and refunds with deterministic 400 Bad Request responses.
- **Responsive Layout Stability:** Verified 0 horizontal layout overflow across 4 standard viewports: 320px (small mobile), 390px (standard mobile), 768px (tablet), and 1440px (desktop).

All 20 Playwright E2E tests and 66 Vitest unit/contract tests pass with zero failures.

---

## 2. SEC-005 Remediation & Rate Limiting Deep-Dive

### SEC-005 BEFORE
Prior to remediation, `POST /api/login` in `server.ts` line 1141 was defined as:
```ts
app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // ... database query and bcrypt.compare
}));
```
There was no rate limiter mounted on `/api/login`. An attacker could execute unbounded credential brute-forcing or credential-stuffing attacks without HTTP 429 throttling or IP backoff.

### SEC-005 REMEDIATION
A dedicated `loginLimiter` was configured in `server.ts` reusing the existing `express-rate-limit` dependency and mounted immediately on `POST /api/login`:
```ts
app.post('/api/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  // ...
}));
```
**Middleware Execution Sequence:**
1. `loginLimiter`: Checks client IP request count within the active window. If threshold exceeded, immediately returns HTTP 429 with standard headers and aborts request processing.
2. Input validation: Checks presence of `email` and `password`. If missing or empty, returns HTTP 400.
3. Authentication lookup: Queries `users` table and executes `bcrypt.compare`. If invalid, returns HTTP 401 without leaking account existence.

### LIMITER CONFIGURATION
```ts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});
```
- **Window:** 15 minutes (`15 * 60 * 1000`)
- **Max Requests:** 10 requests per window per IP
- **Standard Headers:** `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After` enabled
- **Legacy Headers:** `X-RateLimit-*` disabled (`legacyHeaders: false`)
- **Error Response:** Deterministic JSON `{ error: 'Too many login attempts, please try again later.' }`
- **HTTP Status:** 429 Too Many Requests

### 429 TEST
Automated tests in `tests/api/functional-quality-contracts.test.ts` verify:
1. Under-limit requests return rate limit headers (`RateLimit-Limit: 10`) and proceed to normal validation/auth.
2. Bursting past 10 requests from the same IP returns HTTP 429:
   - Status: `429`
   - Headers: `retry-after: 900`, `ratelimit-reset: 900`, `ratelimit-remaining: 0`
   - Body: `{ error: 'Too many login attempts, please try again later.' }`
3. Zero sensitive account data is exposed (no `user`, `email`, `password`, or `userId` in 429 response).
4. Normal input validation errors (HTTP 400) remain intact prior to limit exhaustion.

### REGRESSION RESULT: RATE LIMITING MATRIX

| Endpoint | Limiter | Window / Max | Headers Exposed | 429 Behavior | Current Status |
|---|---|---|---|---|---|
| `POST /api/login` | `loginLimiter` | 15 min / 10 | `ratelimit-*`, `retry-after` | 429 JSON | **PASS / REMEDIATED (SEC-005)** |
| `POST /api/checkout` | `checkoutLimiter` | 1 min / 5 | `x-ratelimit-*` | 429 text | **PASS (Active)** |
| `POST /api/orders` | `orderLimiter` | 1 min / 10 | `x-ratelimit-*` | 429 text | **PASS (Active)** |
| `POST /api/contact` | `contactLimiter` | 1 min / 3 | `x-ratelimit-*` | 429 text | **PASS (Active)** |
| `POST /api/forgot-password` | `emailSensitiveLimiter` | 15 min / 5 | `ratelimit-*`, `retry-after` | 429 JSON | **PASS (Active)** |
| `POST /api/resend-verification` | `emailSensitiveLimiter` | 15 min / 5 | `ratelimit-*`, `retry-after` | 429 JSON | **PASS (Active)** |
| `POST /api/admin/orders/:id/resend-confirmation` | `adminEmailLimiter` | 10 min / 10 | `ratelimit-*`, `retry-after` | 429 JSON | **PASS (Active)** |

---

## 3. Test Execution & Evidence

### 3.1 Unit / Contract Test Suite Execution
```powershell
npm test
```
- **Exit Code:** 0
- **Duration:** 3.61s
- **Suites:** 4 passed (4 total)
- **Tests:** 66 passed (66 total)

### 3.2 Full E2E Test Suite Execution
```powershell
npm run test:e2e
```
- **Exit Code:** 0
- **Duration:** 16.7s
- **Suites:** 3 passed (3 total)
- **Tests:** 20 passed (20 total)

### 3.3 Release Gate Verification
```powershell
.\scripts\qa\validate-release.ps1
```
- **Exit Code:** 0
- **Final Result:** PASS (all 8 release gates passed)

---

## 4. Quality Details

### Task 5: Accessibility Audits (Axe WCAG 2.0 A & AA)

| Surface | URL / Trigger | Critical Violations | Serious Violations | Status |
|---|---|---|---|---|
| Home | `/` | 0 | 0 | PASS |
| Product Detail | `/product/:id` | 0 | 0 | PASS |
| Sign-In | `/sign-in` | 0 | 0 | PASS |
| Cart Drawer | Add to cart click / drawer visible | 0 | 0 | PASS |
| Order Tracking | `/track` | 0 | 0 | PASS |
| Admin Shell | `/admin` | 0 | 0 | PASS |

### Task 7: Input Validation Boundaries

| Flow | Endpoint | Tested Malformed Payload | Expected Status | Contract Body Error |
|---|---|---|---|---|
| Checkout | `POST /api/checkout` | `{}` (missing `orderId`) | 400 | `orderId is required` |
| Login | `POST /api/login` | `{}` (missing fields) | 400 | `Email and password required` |
| Login | `POST /api/login` | `{ email: '   ', password: '' }` | 400 | `Email and password required` |
| Tracking | `GET /api/orders/track` | `?email=only@test.com` (missing `order_id`) | 400 | `Email and order_id required` |
| Contact | `POST /api/contact` | `{ name: 'Test' }` (missing email/message) | 400 | `Missing fields` |
| Refund | `POST /api/admin/orders/:id/refund` | `{ amount: -15 }` (negative amount) | 400 | `Refund amount must be greater than zero` |
| Refund | `POST /api/admin/orders/:id/refund` | `{ amount: 0 }` (zero amount) | 400 | `Refund amount must be greater than zero` |
| Refund | `POST /api/admin/orders/:id/refund` | `{ amount: 250 }` (exceeds $100 total) | 400 | `Refund amount exceeds remaining refundable total` |
| Refund | `POST /api/admin/orders/:id/refund` | `{ amount: 50, restock: true }` (partial restock) | 400 | `Inventory restock is only supported for full order refunds.` |
