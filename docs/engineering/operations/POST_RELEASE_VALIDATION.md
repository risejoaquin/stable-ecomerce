# Post-Release Production Validation & Operational Handoff Protocol

**Document ID**: `VAL-POST-001`  
**Classification**: `DERIVED ENGINEERING DESIGN`  
**Authority**: Mandatory Operational Protocol for Post-Release Validation  
**Execution Date**: **05 Oct 2026** (Mandatory & Frozen)  
**Parent Epic**: `CCP-38` / `CCP-44`  

---

## 1. Executive Summary & Objective

This document defines the post-release validation, synthetic verification, operational telemetry observation, and formal handoff procedures executed immediately following the Client 01 production deployment on **05 Oct 2026**.

The post-release period ensures that the newly deployed code behaves properly under live production conditions before the release team disbands and turns operational ownership over to the steady-state support team.

> **MANDATORY CALENDAR RULE (FROZEN)**:  
> **Post-Release Validation and Operational Handoff occur on 05 Oct 2026.** References to 03 Oct production handoff are stale and strictly prohibited.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Production validation must execute within 15 minutes of container deployment.
   - All synthetic validation checks in production must be strictly non-destructive or execute against isolated test-only catalog entities.
   - A mandatory 60-minute telemetry observation window must be maintained post-deploy before declaring formal operational handoff complete.

2. **FROZEN CONTRACT**:
   - Live endpoints must satisfy `DR-ERR-001` (structured errors), `DR-INV-001` (inventory integrity), and `DR-AUTH-001` (POS access control).

3. **DERIVED ENGINEERING DESIGN**:
   - Automated synthetic smoke execution via `scripts/qa/validate-production.ps1`.
   - Core production telemetry dashboards (Sentry, Railway metrics, Pino logs).
   - Formal operational handoff checklist and sign-off certificate.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Synthetic check polling frequency (every 60 seconds during the first 15 minutes).

---

## 3. Post-Deployment Verification Timeline (05 Oct 2026)

```
[10:20 UTC] Railway Container Deployment Starts
     │
     ▼
[10:28 UTC] Container Boots Successfully
     │
     ▼
[10:30 UTC] Phase 1: Automated Synthetic Smoke Execution (T+0 to T+15 min)
     │       Run scripts/qa/validate-production.ps1
     ▼
[10:45 UTC] Phase 2: Live Functional Smoke Sweep (T+15 to T+30 min)
     │       Verify Storefront Home, PDP, Web POS Login & Catalog Search
     ▼
[11:00 UTC] Phase 3: Telemetry & Log Stream Monitoring (T+30 to T+90 min)
     │       Monitor Sentry, Pino logs, Stripe Webhooks, DB latency
     ▼
[11:45 UTC] Phase 4: Operational Handoff Sign-off & Team Stand-down
```

---

## 4. Phase 1: Automated Production Smoke Suite

Executed by the Release Coordinator immediately following container boot:

```powershell
.\scripts\qa\validate-production.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -ExpectedCommit "$RELEASE_COMMIT_SHA"
```

### Assertions Evaluated:
1. **Liveness**: `GET /api/health` returns HTTP 200 with `status: "ok"` and matching Git SHA.
2. **Readiness**: `GET /api/readiness` returns HTTP 200 with `status: "ready"`.
3. **Public Catalog**: `GET /api/products` returns active product catalog without database error.
4. **Security Headers**: Verifies strict CSP, HSTS, X-Content-Type-Options, and CORS headers.
5. **Static Assets**: Verifies responsive CSS, bundled JS chunks, and WebP product images serve with HTTP 200 and appropriate caching headers.

---

## 5. Phase 2: Live Functional Smoke Sweep

The QA Lead executes non-destructive manual verifications in production:

### 5.1 Storefront Verification
1. Access `https://selfcaresinners.com`.
2. Verify home page layout, category collection grid, and soft-premium brand aesthetics.
3. Open a sample product PDP; verify image carousel, variant selector, and pricing display.
4. Add item to cart; verify cart drawer opens and subtotal matches displayed price.
5. Navigate to checkout entry; verify Stripe Elements mount properly. *(Do not submit real live card unless executing pre-planned canary transaction)*.

### 5.2 Web POS Verification
1. Open POS login at `https://selfcaresinners.com/admin/pos` using authorized production credentials.
2. Verify catalog search returns live products and accurate stock advisory indicators.
3. Verify cash tender change calculation interface responds instantaneously.
4. Verify non-admin accounts receive `403 FORBIDDEN` when attempting to access the POS route.

---

## 6. Phase 3: Telemetry & Error Stream Observation

During the 60-minute post-deploy observation window, the Technical Operator monitors:

| Observability Channel | Metric Observed | Normal Baseline | Escalation Threshold |
| :--- | :--- | :--- | :--- |
| **Sentry Exception Stream** | New unhandled errors | 0 new issues | Any 5xx error or unhandled promise rejection |
| **Pino Server Logs** | Error log frequency | Level 30 (Info) predominant | Level 50 (Error) > 2 per minute |
| **Railway Runtime** | Memory / CPU usage | Memory < 70%, CPU < 40% | Memory > 90% or CPU throttling |
| **Stripe Dashboard** | Webhook delivery success | 100% success rate | Any webhook delivery failure (HTTP 4xx/5xx) |
| **Database Pool** | Active connections | < 20 active connections | Pool exhaustion (> 80% capacity) |

---

## 7. Phase 4: Operational Handoff Checklist & Sign-Off

At 11:45 UTC on **05 Oct 2026**, when all smoke tests and telemetry observations are confirmed green, the Release Team hands over the production system to the Ongoing Operations & Support Team:

### Handoff Verification Checklist:
- [ ] Production deployment running stable on Railway container for > 60 minutes.
- [ ] 100% of automated and functional smoke assertions passed.
- [ ] Sentry error rate is within normal baseline (< 0.1%).
- [ ] All 12 operational runbooks and 9 execution packs are committed and indexed under `docs/engineering/operations/`.
- [ ] On-call rotation established and emergency contact numbers verified.
- [ ] Rollback and disaster recovery procedures reviewed with on-call personnel.

### Formal Handoff Declaration:
```
+-----------------------------------------------------------------------------+
|               CLIENT 01 OPERATIONAL HANDOFF SIGN-OFF CERTIFICATE            |
+-----------------------------------------------------------------------------+
| Date: 05 Oct 2026 (11:45 UTC)                                               |
| Deployed Version: Client 01 v1.0 (Git SHA: $RELEASE_COMMIT_SHA)             |
| Live Production URL: https://selfcaresinners.com                            |
|                                                                             |
| VALIDATION SUMMARY:                                                         |
| [X] Automated Production Smoke Tests         - PASS                         |
| [X] Live Storefront Functional Sweep         - PASS                         |
| [X] Web POS Functional Sweep                 - PASS                         |
| [X] 60-Minute Telemetry Observation          - PASS                         |
| [X] Zero Sev-1 / Sev-2 Unresolved Defects    - PASS                         |
|                                                                             |
| HANDOFF ACKNOWLEDGEMENT:                                                    |
| Release Coordinator: [Signed: Agent C]              Date: 05 Oct 2026       |
| Engineering Lead   : [Signed: Rogelio]              Date: 05 Oct 2026       |
| Operations On-Call : [Signed: On-Call Lead]         Date: 05 Oct 2026       |
| Product Owner      : [Signed: Julian]               Date: 05 Oct 2026       |
|                                                                             |
| STATUS: CLIENT 01 PLATFORM OFFICIALLY TRANSITIONED TO OPERATIONAL STATUS    |
+-----------------------------------------------------------------------------+
```
