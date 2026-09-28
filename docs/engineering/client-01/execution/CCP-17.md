# Execution Pack: CCP-17 — Resend Webhook Security — HMAC Signature Verification Regression Test & Preservation

## 1. Responsibility
- **Lead Domain**: Security & Backend Infrastructure
- **Assignee Lead**: Joaquin (Technical & Release Authority / Security Lead) / Rogelio (Backend Lead)
- **Secondary Reviewer**: QA Automation Lead

## 2. Objective
Execute automated regression test verification of the Resend webhook HMAC signature enforcement in `src/server/email/email-webhooks.ts` via `scripts/qa/security/validate-resend-webhook-signature.ps1`, confirming that forged or missing Svix signature headers are rejected with HTTP 401, while preserving the existing verified implementation with zero unnecessary code refactoring.

## 3. Why
Fulfills **SEC-001** (P0 Critical Security Gate). Email delivery webhooks trigger internal order communication state changes and customer notifications. Without cryptographic HMAC signature validation, malicious actors could forge webhook delivery notifications, manipulate order communication histories, or trigger unauthorized email retransmissions.

## 4. Owner Profile
Senior Security / Backend Systems Engineer with expertise in cryptographic HMAC signatures, Svix webhook verification standards, Express middleware pipeline security, and automated security regression suites.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- Webhook secret environment variable `RESEND_WEBHOOK_SECRET` configured in staging and local test environments.
- Existing webhook verification implementation in `src/server/email/email-webhooks.ts` intact.

## 6. Dependencies
- **Preceding Tickets**: CCP-44 (Contract Freeze Gate).
- **Downstream Blocking**: Blocks CCP-23 (Transactional Email Automation) and CCP-36 (Hardening Window & Zero-Defect Signoff).

## 7. Authoritative Contracts
- **SEC-001 (Resend Webhook Cryptographic Verification Standard)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/12_SECURITY_INVARIANTS.md`
- `docs/engineering/operations/CI_QUALITY_GATES.md`

## 8. Scope IN
- Automated execution and verification of `scripts/qa/security/validate-resend-webhook-signature.ps1`.
- Vitest / Supertest API suite asserting HTTP 401 on missing `svix-id`, `svix-timestamp`, or `svix-signature` headers.
- Test asserting HTTP 401 on forged signatures or expired timestamps (> 5 minutes drift).
- Test asserting HTTP 200 on correctly signed payloads using test secret.
- Preservation of existing implementation without unapproved refactoring.

## 9. Scope OUT
- Rewriting or altering the Resend webhook transport logic.
- Implementing product business features or order workflows.
- Altering external Resend production webhook configuration.

## 10. Required Behavior
1. Incoming webhook requests to `/api/webhooks/resend` must provide headers: `svix-id`, `svix-timestamp`, and `svix-signature`.
2. Middleware computes HMAC-SHA256 over `${svix_id}.${svix_timestamp}.${rawBody}` using `RESEND_WEBHOOK_SECRET`.
3. If headers are absent, timestamp is outside the 5-minute tolerance window, or signature comparison fails, request is terminated with HTTP 401 Unauthorized.
4. Timing-safe comparison (`crypto.timingSafeEqual`) must be used to prevent timing attacks.
5. Legitimate signed requests parse payload and dispatch internal events without error.

## 11. Inputs
- HTTP POST request to `/api/webhooks/resend` with raw binary/text payload.
- Headers: `svix-id`, `svix-timestamp`, `svix-signature`.
- Environment variable: `RESEND_WEBHOOK_SECRET`.

## 12. Outputs
- HTTP 200 OK with `{ "received": true }` on valid signature.
- HTTP 401 Unauthorized with canonical error message on signature verification failure.
- Audit log entry recording signature rejection.

## 13. Allowed Implementation Freedom
- Adding supplementary diagnostic test cases to `tests/api/resend-webhook-security.test.ts`.
- Adjusting mock timestamp generator in unit test fixtures.

## 14. Forbidden Changes
- DO NOT weaken signature verification or introduce bypass flags in production code.
- DO NOT remove raw body parsing required for cryptographic signature matching.
- DO NOT expose `RESEND_WEBHOOK_SECRET` in client bundles or logs.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `tests/api/resend-webhook-security.test.ts`
  - `scripts/qa/security/validate-resend-webhook-signature.ps1`
- **Strictly Prohibited**:
  - Unnecessary refactoring of `src/server/email/email-webhooks.ts` unless a verifiable defect is uncovered.

## 16. Data Impact
- Zero schema or table modifications.
- Webhook events persist immutable delivery records in `email_events`.

## 17. API Impact
- Secures existing route `POST /api/webhooks/resend`.
- No breaking changes to response schemas.

## 18. Security
- Mitigates CWE-345 (Insufficient Verification of Data Authenticity) and CWE-347 (Improper Verification of Cryptographic Signature).
- Uses constant-time comparison to prevent side-channel timing attacks.
- Enforces replay attack prevention via timestamp drift checks (tolerance window = 300 seconds).

## 19. Concurrency & Idempotency
- Webhooks process idempotent events based on `svix-id` and email message ID; duplicate webhook dispatches do not duplicate side-effects.

## 20. Migration Considerations
- None. Verification applies to existing codebase infrastructure.

## 21. Edge Cases
- Request with valid signature but timestamp skewed by +10 minutes (replay attack): rejected with HTTP 401.
- Request with empty payload but valid headers: rejected with HTTP 400/401.
- Mismatched secret: rejected with HTTP 401.

## 22. Observability
- Security rejections logged with `x-request-id`, client IP, and specific failure reason (`MISSING_HEADERS`, `TIMESTAMP_DRIFT`, `INVALID_SIGNATURE`) without logging secret values.

## 23. Acceptance Criteria
- [ ] Automated script `scripts/qa/security/validate-resend-webhook-signature.ps1` exits with code 0 PASS.
- [ ] API test confirms HTTP 401 on missing Svix headers.
- [ ] API test confirms HTTP 401 on forged signature.
- [ ] API test confirms HTTP 200 on legitimate signature generated with test secret.
- [ ] Zero lines of unneeded refactoring introduced into verified source files.

## 24. Test Strategy
- Run automated security test script:
  ```powershell
  .\scripts\qa\security\validate-resend-webhook-signature.ps1
  ```
- Run Vitest security test suite:
  ```bash
  npm test tests/api/resend-webhook-security.test.ts
  ```

## 25. Staging Validation
- Trigger synthetic webhook event using Railway staging CLI / curl with signed fixture, verify HTTP 200 response and entry in `email_events`.

## 26. Evidence Requirements
- Raw terminal log output of `validate-resend-webhook-signature.ps1` demonstrating exit code 0.
- Supertest suite execution transcript confirming HTTP 401 on tampering.

## 27. Definition of Done
- Validation script and test suite exit 100% green.
- Security review confirmed by Technical Authority (@risejoaquin).
- P0 Security Gate closed for CCP-36 hardening window.

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Rogelio (consume verified webhook infrastructure in CCP-23) and QA Lead (CCP-36 hardening).
