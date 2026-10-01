# Execution Pack: CCP-18 — Product Media Upload Security — Legacy Route Lockdown & MIME Whitelist Verification

## 1. Responsibility
- **Lead Domain**: Security & Backend Infrastructure
- **Assignee Lead**: Joaquin (Technical & Release Authority / Security Lead) / Rogelio (Backend Lead)
- **Secondary Reviewer**: Julian (Frontend Lead)

## 2. Objective
Lock down legacy unauthenticated product media upload routes, verify that `/api/upload/product-image` enforces strict staff authentication (`owner`/`admin`), 5MB maximum file size limits, and an immutable image MIME whitelist (`image/jpeg`, `image/png`, `image/webp`), and validate enforcement via `scripts/qa/security/validate-legacy-upload-authorization.ps1`.

## 3. Why
Fulfills **SEC-002** (P1 Critical Security Gate). File upload endpoints without authentication or strict MIME validation expose servers to Remote Code Execution (RCE), Server-Side Request Forgery (SSRF), Cross-Site Scripting (XSS via SVG injection), and Denial of Service (DoS via large file exhaustion). Restricting media uploads strictly to authenticated administrators with whitelisted raster formats closes this attack surface.

## 4. Owner Profile
Senior Backend / Security Engineer with expertise in Express middleware security, Multer multi-part form handling, magic number byte inspection, and automated API security penetration testing.

## 5. Preconditions
- Contract Freeze gate (CCP-44) approved.
- Multer storage and upload pipeline configured in `server.ts` or `src/server/upload/`.
- Admin authentication middleware operational.

## 6. Dependencies
- **Preceding Tickets**: CCP-44 (Contract Freeze Gate).
- **Downstream Blocking**: Blocks CCP-21 (Admin Catalog UI) and CCP-36 (Hardening Window & Zero-Defect Signoff).

## 7. Authoritative Contracts
- **SEC-002 (Product Media Upload Security Standard)**
- **DR-AUTH-001 (Staff Role Authorization Model)**
- **DR-ERR-001 (Canonical Error Envelope)**
- `docs/engineering/client-01/12_SECURITY_INVARIANTS.md`

## 8. Scope IN
- Lockdown or removal of any unauthenticated legacy upload endpoints (e.g. generic `/api/upload`).
- Verification that all upload routes require active session with role `admin` or `owner`.
- Multer configuration enforcing:
  - Allowed MIME types: strictly `image/jpeg`, `image/png`, `image/webp`.
  - Prohibited types: SVG, HTML, PDF, executable binaries (`.exe`, `.sh`), script files.
  - File size cap: 5MB maximum.
- Execution and validation of automated script `scripts/qa/security/validate-legacy-upload-authorization.ps1`.
- Automated test coverage in `tests/api/media-upload-security.test.ts`.

## 9. Scope OUT
- Migrating cloud storage backend away from Supabase Storage buckets.
- Building frontend media selection UI (handled under CCP-21).
- Modifying product catalog database schemas.

## 10. Required Behavior
1. Requests to `/api/upload` or `/api/upload/product-image` without valid admin authentication tokens must be rejected with HTTP 401 Unauthorized or HTTP 403 Forbidden.
2. Uploaded files must match the whitelist `image/jpeg`, `image/png`, `image/webp` based on header MIME type and file extension.
3. Upload of SVG files (`image/svg+xml`) must be rejected with HTTP 400 Bad Request to prevent stored XSS attacks.
4. Upload of files exceeding 5MB must be rejected with HTTP 413 Payload Too Large.
5. Successful admin uploads generate a unique UUID filename, store media in the designated bucket, and return the public CDN URL.

## 11. Inputs
- Multi-part form-data payload containing file binary under field `image` or `file`.
- Admin bearer authentication token / session cookie.

## 12. Outputs
- HTTP 200/201 with JSON `{ "url": "https://...", "filename": "uuid.webp" }` on success.
- HTTP 401/403 on missing or unauthorized role.
- HTTP 400 on disallowed MIME type or extension.
- HTTP 413 on file size exceeding 5MB.

## 13. Allowed Implementation Freedom
- Internal Multer disk storage vs memory buffer configuration.
- Image transformation/optimization pipeline (e.g. automatic conversion to WebP via Sharp if configured).

## 14. Forbidden Changes
- DO NOT permit unauthenticated file uploads under any route.
- DO NOT allow SVG, HTML, or executable file types in upload whitelists.
- DO NOT allow file uploads exceeding 5MB.
- DO NOT trust raw user-supplied filenames without UUID sanitization.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `server.ts` (upload route guards and middleware registration)
  - `src/server/upload/` (Multer configuration)
  - `tests/api/media-upload-security.test.ts`
  - `scripts/qa/security/validate-legacy-upload-authorization.ps1`
- **Strictly Prohibited**:
  - Frontend components or client-side storage keys.

## 16. Data Impact
- Zero database schema migrations.
- Uploaded media records persisted to Supabase Storage `product-images` bucket.

## 17. API Impact
- Restricts existing upload endpoints to authenticated admin sessions.
- Closes unauthenticated endpoints returning HTTP 404 or 401/403.

## 18. Security
- Mitigates CWE-434 (Unrestricted Upload of File with Dangerous Type) and CWE-284 (Improper Access Control).
- File storage paths randomized via UUID v4 to prevent directory traversal and path manipulation.
- SVG upload blocked to prevent Cross-Site Scripting (XSS).

## 19. Concurrency & Idempotency
- Each upload produces an independent immutable UUID artifact in storage.

## 20. Migration Considerations
- Existing legitimate product images already hosted in storage remain unaffected.

## 21. Edge Cases
- File with `.png` extension containing executable ELF/PE binary payload: rejected via MIME type inspection.
- Zero-byte file: rejected with HTTP 400.
- Multi-file batch upload attempt on single-file route: excess files ignored or rejected.

## 22. Observability
- Failed upload attempts logged with client IP, authenticated user ID (if present), attempted filename, and rejection reason.

## 23. Acceptance Criteria
- [ ] Unauthenticated requests to `/api/upload` and `/api/upload/product-image` return HTTP 401/403.
- [ ] Non-admin authenticated user (`user` or `support`) receives HTTP 403 Forbidden.
- [ ] Uploading SVG, executable, or non-whitelisted MIME type returns HTTP 400.
- [ ] Uploading file > 5MB returns HTTP 413.
- [ ] Automated script `scripts/qa/security/validate-legacy-upload-authorization.ps1` exits with code 0 PASS.

## 24. Test Strategy
- Execute automated security test script:
  ```powershell
  .\scripts\qa\security\validate-legacy-upload-authorization.ps1
  ```
- Run Supertest upload security suite:
  ```bash
  npm test tests/api/media-upload-security.test.ts
  ```

## 25. Staging Validation
- Attempt upload via curl without auth header against Railway staging; assert HTTP 401/403 response.
- Attempt admin upload with valid JPEG; assert HTTP 201 response and valid CDN URL.

## 26. Evidence Requirements
- Terminal execution transcript of `validate-legacy-upload-authorization.ps1` with exit code 0.
- Automated test output showing rejection of unauthenticated requests and malicious MIME types.

## 27. Definition of Done
- Validation script and test suite exit 100% green.
- Security review confirmed by Technical Authority (@risejoaquin).
- P1 Security Gate closed for CCP-36 hardening window.

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: Julian (consume verified upload endpoint in CCP-21 Admin Catalog UI) and QA Lead (CCP-36 hardening).
