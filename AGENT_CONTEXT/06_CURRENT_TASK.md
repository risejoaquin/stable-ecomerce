# CURRENT TASK

TASK ID: QA-RELEASE-E-HOTFIX-SEC-005-LOGIN-RATE-LIMITING-20260917
BLOCK: QA / RELEASE E Final Hotfix — SEC-005 Login Rate Limiting
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION

## Objective

Close the final QA / RELEASE E blocker: SEC-005 (`POST /api/login` currently lacks a dedicated rate limiter). Add a dedicated IP-based rate limiter to `POST /api/login` before credential verification and input validation using the existing `express-rate-limit` dependency, add permanent automated contract tests proving mounting, under-limit pass-through, 429 burst exhaustion, header compliance, and non-leakage, and execute full validation gates.

## Files in scope

- `server.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/evidence/block-b/2026-09-17-final-quality-gaps.md`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`

## Completed

1. **Task 1 & Task 2 (Inspect & Add Login Limiter):**
   - Configured `loginLimiter` using `express-rate-limit`:
     - `windowMs: 15 * 60 * 1000` (15 minutes)
     - `max: 10` (10 requests per IP per window)
     - `standardHeaders: true` (`RateLimit-*` and `Retry-After`)
     - `legacyHeaders: false`
     - `message: { error: 'Too many login attempts, please try again later.' }`
2. **Task 3 (Middleware Order):**
   - Mounted `loginLimiter` on `POST /api/login` before input validation and bcrypt verification:
     `app.post('/api/login', loginLimiter, asyncHandler(async (req, res) => { ... }))`
   - Flow: Request -> `loginLimiter` (throttles with 429) -> Input Validation (returns 400 if missing) -> DB & bcrypt Auth (returns 401 if invalid).
   - Zero credential or account existence leakage.
3. **Task 4 (Automated Tests):**
   - Added permanent tests in `tests/api/functional-quality-contracts.test.ts`:
     - Rate limiter headers exposed on under-limit requests (`ratelimit-limit: 10`, `ratelimit-remaining`).
     - Requests under limit reach normal input validation without weakening.
     - Burst requests exceeding limit return HTTP 429 `Too Many Requests`.
     - 429 response contains `retry-after` header and deterministic error JSON.
     - 429 response does not expose sensitive account information.
     - Other rate limiters (checkout, orders, contact, forgot-password, resend-verification, admin resend) remain unchanged.
4. **Task 5 (Security Regression):**
   - All 7 endpoints verified rate-limited:
     1. `login`: RATE LIMITED (`loginLimiter`, 10/15m)
     2. `checkout`: RATE LIMITED (`checkoutLimiter`, 5/1m)
     3. `orders`: RATE LIMITED (`orderLimiter`, 10/1m)
     4. `contact`: RATE LIMITED (`contactLimiter`, 3/1m)
     5. `forgot-password`: RATE LIMITED (`emailSensitiveLimiter`, 5/15m)
     6. `resend-verification`: RATE LIMITED (`emailSensitiveLimiter`, 5/15m)
     7. `admin resend`: RATE LIMITED (`adminEmailLimiter`, 10/10m)
5. **Task 6 (Full Validation):**
   - `npm run lint`: PASS (0 errors)
   - `npm test`: PASS (66/66 tests passing across 4 files)
   - `npm run build`: PASS (Vite client 8.02s + esbuild server bundle 72ms)
   - `npm run test:e2e`: PASS (20/20 tests passing across 3 spec files)
   - `npm run qa:release`: PASS (all 8 release gates passing)
   - `git diff --check`: PASS (0 errors)
6. **Task 7 (Evidence Updates):**
   - Documented `SEC-005 BEFORE`, `SEC-005 REMEDIATION`, `LIMITER CONFIGURATION`, `429 TEST`, and `REGRESSION RESULT` in `AGENT_CONTEXT/evidence/block-b/2026-09-17-final-quality-gaps.md`.

## Pending / Next Steps for ChatGPT Web

- Review SEC-005 remediation evidence.
- Review and authorize staging, commit, and push.
- Monitor GitHub Actions CI and Railway deployment.
- Determine whether QA / RELEASE E can now be formally marked CLOSED.

## Last command

```text
npm run qa:release
```

## Last result

```text
========================================
SELFCARE SINNERS - RELEASE GATE
TypeScript                     PASS
Unit tests                     PASS
Build                          PASS
Secret scan                    PASS
Resend webhook security        PASS
Legacy upload authorization    PASS
Security baseline report       PASS
Core regression                PASS
FINAL RESULT                   PASS
========================================
```

## Blockers

- None. SEC-005 remediation fully verified.
