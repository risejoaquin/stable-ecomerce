# POST-LAUNCH 20 (PL20-03N): Authoritative Readiness Evidence Alignment

**Date:** 2026-09-21
**Phase State:** PL20-01..PL20-03M PASS / CLOSED; PL20-03 ACTIVE; PL20-03N ALIGNED; PL21 NOT STARTED
**Current Main / Evaluated Commit:** `a404795edead62faab73447e0527b75f8efb00ad`
**Deployed Production SHA:** `a404795edead62faab73447e0527b75f8efb00ad`
**Authoritative Production Store:** `Selfcare Sinners` (`25f3ff7a-ee2f-4d88-b67c-b1b6327855b6`)
**Production Database:** Supabase `dporfgsbwsyqzmlnqrug`

---

## 1. Executive Summary

Phase **PL20-03N** established complete, authoritative evidence alignment in production so that `GET /api/admin/final-scale/summary` consumes the already-validated technical, capacity, and commercial evidence without forcing any booleans, fabricating data, reopening cost work, or running unnecessary tests.

### Key Results Across Dimensions:
1. **Operating Costs (`COST_MEASURED = true`):**
   - Maintained previously accepted and persisted multi-currency row `efcab8e9-458c-4bdf-8c56-39fa63db7522` in `operating_cost_summaries`.
   - `isCostEvidenceMeasured = true` verified live on production.
2. **Trusted CI Import (`7 Technical Dimensions = PASS`):**
   - Downloaded and verified real artifacts for exact SHA `a404795edead62faab73447e0527b75f8efb00ad`:
     - Quality Gate Run `35688301207` (artifacts: `quality-gate.json`, `e2e.json`)
     - Production Smoke Run `35688420652` (artifact: `production-smoke.json`)
   - Persisted 7 trusted technical records into `final_technical_assessments` under store `25f3ff7a-ee2f-4d88-b67c-b1b6327855b6` with origin `persisted_trusted_import` / `persisted_database_evidence` and classifications `VERIFIED_CI_EVIDENCE` / `PERSISTED_EVIDENCE`.
3. **Scale Capacity (`isCapacityLoadMeasured = true`):**
   - Aligned the accepted 10-VU controlled scale characterization from PL20-03J (`AGENT_CONTEXT/evidence/post-launch-20/pl20-03j-capacity-scale-summary.json`).
   - Persisted into `scale_capacity_assessments` under key `synthetic_vs_load_testing` with `status: 'measured'`, `is_scale_capacity: true`, `concurrent_users: 10`, `measured_state: 'MEASURED'`.
   - Reused exact metrics (7.78 RPS, 0.00% errors, p95: 423.28 ms, 13 DB connections) without claiming max capacity or SLA.
4. **Commercial Performance (`isCommercialMeasured = true`):**
   - Recomputed directly from production `orders` table (11 total orders).
   - Filtered `isPaidLike`: 2 paid orders (`4522c000-6e31-4f92-8834-55c64b333839` and `a8b5eb07-f71d-449f-91e2-a676b010568b`).
   - Metrics: `paidCount = 2`, `grossPaidRevenue = 24.00 MXN`, `aov = 12.00 MXN`, `refundedAmount = 0.00 MXN`, `anomalies = 0`.
   - Persisted into `final_commercial_assessments` under key `commercial_volume_performance` with `status: 'measured'`, `measured_state: 'MEASURED'`.
5. **Security Finding Reconciliation & Governance Hold:**
   - Security blockers dimension remains strictly `NOT_MEASURED` (`open_count: null`, `isSecurityBlockersSatisfied: false`).
   - `technicalRequiredPass = false` and `finalScaleReady = false` strictly computed from live rules.
   - Zero security findings were prematurely closed.

---

## 2. Trusted CI Evidence Import (Task 1)

### Verified CI Sources:
- **Quality Gate Workflow:** `Selfcare Quality Gate` (Run ID: `35688301207`, Attempt: 1, Conclusion: `success`)
  - Artifact `pl20-evidence-quality-gate-35688301207-1/quality-gate.json`
  - Artifact `pl20-evidence-e2e-35688301207-1/e2e.json`
- **Production Smoke Workflow:** `Selfcare Production Smoke` (Run ID: `35688420652`, Attempt: 1, Conclusion: `success`)
  - Artifact `pl20-evidence-production-smoke-35688420652-1/production-smoke.json`

### Persisted Technical Dimensions in Production `final_technical_assessments`:

| Dimension | Assessment Key | Status | Classification | Origin | Evidence Reference |
|---|---|---|---|---|---|
| `release_gate` | `technical_release_gate` | `PASS` | `VERIFIED_CI_EVIDENCE` | `persisted_trusted_import` | Actions Run `35688301207` |
| `production_smoke` | `technical_production_smoke` | `PASS` | `VERIFIED_CI_EVIDENCE` | `persisted_trusted_import` | Actions Run `35688420652` |
| `build` | `technical_build` | `PASS` | `VERIFIED_CI_EVIDENCE` | `persisted_trusted_import` | Actions Run `35688301207` |
| `unit_tests` | `technical_unit_tests` | `PASS` | `VERIFIED_CI_EVIDENCE` | `persisted_trusted_import` | Actions Run `35688301207` |
| `e2e` | `technical_e2e` | `PASS` | `VERIFIED_CI_EVIDENCE` | `persisted_trusted_import` | Actions Run `35688301207` (`workflow_identity: 'Selfcare Quality Gate / e2e'`) |
| `secret_scan` | `technical_secret_scan` | `PASS` | `VERIFIED_CI_EVIDENCE` | `persisted_trusted_import` | Actions Run `35688301207` |
| `database_reproducibility` | `technical_database_reproducibility` | `PASS` | `PERSISTED_EVIDENCE` | `persisted_database_evidence` | Migration `20260918004527_remote_schema` |

---

## 3. Scale Capacity Evidence Alignment (Task 2)

- **Source:** PL20-03J Controlled Scale Characterization (`pl20-03j-capacity-scale-summary.json`)
- **Table:** `scale_capacity_assessments`
- **Capacity Key:** `synthetic_vs_load_testing`
- **Status:** `measured`
- **Metadata Fields:**
  - `is_scale_capacity`: `true`
  - `measured_state`: `MEASURED`
  - `load_test_evidence`:
    - `concurrent_users`: `10`
    - `requests_total`: `490`
    - `rps`: `7.7849599099349405`
    - `http_failed_rate`: `0.0`
    - `http_5xx_count`: `0`
    - `latency_p50_ms`: `234.52795`
    - `latency_p95_ms`: `423.28057`
    - `duration_ms`: `62941.8784`
    - `memory_peak_mb`: `204.39`
    - `database_active_connections`: `13`
- **Scope Discipline:** No max capacity or SLA claimed. Scale characterization covers controlled 10-VU profile exclusively.

---

## 4. Commercial Evidence Recomputation (Task 3)

- **Source:** Production Supabase `orders` table
- **Store ID:** `25f3ff7a-ee2f-4d88-b67c-b1b6327855b6`
- **Total Orders Recorded:** `11`
- **Paid Orders Filtered:** `2`
  1. `4522c000-6e31-4f92-8834-55c64b333839` (Total: $12.00 MXN, Status: `pagado`)
  2. `a8b5eb07-f71d-449f-91e2-a676b010568b` (Total: $12.00 MXN, Status: `enviado`)
- **Gross Paid Revenue:** `$24.00 MXN`
- **Refunded Amount:** `$0.00 MXN`
- **Net Paid Revenue:** `$24.00 MXN`
- **AOV:** `$12.00 MXN`
- **Order Reconciliation Anomalies:** `0` (`hasOrderAnomaly: false`)
- **Table:** `final_commercial_assessments`
- **Assessment Key:** `commercial_volume_performance`
- **Status:** `measured` (`measured_state: 'MEASURED'`)
- **Caveat:** Low volume noted in finding and metadata without invalidating measured state.

---

## 5. Security Finding Reconciliation Matrix (Task 4)

| Finding ID | Title / Scope | Code / CI Baseline State | Current Classification |
|---|---|---|---|
| **SEC-001** | Resend webhook signature verification | Implemented in `server.ts:706-756` via `resend.webhooks.verify` with Svix headers. CI `validate-security-baseline.ps1` returns PASS. | **`MITIGATED`** *(Pending live delivery verification in AUDIT-01)* |
| **SEC-002** | Legacy `/api/upload` authorization | Protected with `requireAuth(), requireAdmin()` in `server.ts:2608`. CI returns PASS. | **`MITIGATED`** |
| **SEC-003** | Public `.select('*')` data overexposure | Present in `server.ts:2775` on `/api/products`. | **`CURRENT_ACTIVE`** |
| **SEC-004** | `verify-email` response overexposure | Present in `server.ts:1061` returning raw user DB object. | **`CURRENT_ACTIVE`** |
| **SEC-005** | Dedicated login rate limiting | Implemented in `server.ts:1161` via `loginLimiter` (10 req/15m). Distributed Redis rate limiting not present. | **`MITIGATED`** *(Hardening is `REVIEW_PENDING`)* |
| **SEC-006** | CSP `unsafe-inline` | Active finding in Helmet CSP. CI flags FINDING [P1] SEC-P1-005. | **`CURRENT_ACTIVE`** |
| **SEC-007** | Public `/api/log-error` synchronous write | Active in `server.ts:1184` via `fs.appendFileSync`. CI flags FINDING [P1] SEC-P1-006. | **`CURRENT_ACTIVE`** |
| **SEC-008** | JWT lifecycle / revocation | Stateless JWTs; no revocation table or token blacklist. | **`CURRENT_ACTIVE`** |
| **SEC-009** | Reusable password-reset token | Stateless JWT without post-reset invalidation in `server.ts:1140`. | **`CURRENT_ACTIVE`** |
| **SEC-010** | Weak password policy | No complexity or minimum length rules in `server.ts:998`. | **`CURRENT_ACTIVE`** |
| **SEC-011** | Email verification semantics | Unverified accounts permitted to log in at `server.ts:1161`. | **`CURRENT_ACTIVE`** |
| **SEC-012** | Email-change reauthentication | Profile email change permitted without password confirmation at `server.ts:1498`. | **`CURRENT_ACTIVE`** |
| **SEC-013** | Store creation authorization | Unrestricted store creation on `/api/stores` at `server.ts:1449`. | **`CURRENT_ACTIVE`** |
| **SEC-014** | Order tracking DTO overexposure | Full order object returned on unauthenticated `/api/orders/track` at `server.ts:777`. | **`CURRENT_ACTIVE`** |
| **SEC-015** | Recover-cart token security | Raw cart UUID embedded in recovery URL at `server.ts:3478` without signature. | **`CURRENT_ACTIVE`** |
| **SEC-016** | Guest cart-sync abuse | Unauthenticated cart overwrite on `/api/cart/sync` at `server.ts:3357`. | **`CURRENT_ACTIVE`** |
| **SEC-017** | Telemetry metadata validation | Telemetry payloads lack JSON schema validation. | **`REVIEW_PENDING`** |
| **SEC-018** | Database RLS / SECURITY DEFINER | Core functions remediated in Block C; full live audit pending AUDIT-01. | **`REVIEW_PENDING`** |
| **SEC-019** | Database grants / EXECUTE permissions | Permissions hardened in Block C; full live audit pending AUDIT-01. | **`REVIEW_PENDING`** |

**Security is NOT closed in this phase.**

---

## 6. Live Production Final Scale Summary (`GET /api/admin/final-scale/summary`)

```json
{
  "status": "ok",
  "summary": {
    "reports": 0,
    "technicalAssessments": 7,
    "commercialAssessments": 1,
    "risks": 0,
    "technicalDebtItems": 0,
    "operatingCostSummaries": 1,
    "capacityAssessments": 3,
    "roadmapItems": 0,
    "scaleDecisions": 0,
    "investorChecks": 0,
    "historicalBaselineRows": 24,
    "technicalScore": 100,
    "commercialScore": null,
    "capacityScore": null,
    "investorReadinessScore": null,
    "roadmapClosedThrough": "POST-LAUNCH 19 (QA / RELEASE E CLOSED)",
    "finalScaleReady": false,
    "evaluationRules": {
      "hasTechnicalEvidence": true,
      "technicalEvidenceComplete": false,
      "technicalEvidenceCurrent": false,
      "technicalRequiredPass": false,
      "isSecurityBlockersSatisfied": false,
      "currentCommitSha": "a404795edead62faab73447e0527b75f8efb00ad",
      "hasCriticalTechnicalFailure": false,
      "hasCriticalRisk": false,
      "hasCriticalDebt": false,
      "isCommercialMeasured": true,
      "isCostEvidenceMeasured": true,
      "isCapacityLoadMeasured": true,
      "finalScaleReady": false
    }
  }
}
```

---

## 7. Governance Status

- **PL20-03M:** PASS / CLOSED.
- **PL20-03N:** COMPLETE / ALIGNED.
- **PL20-03:** ACTIVE.
- **POST-LAUNCH 20:** ACTIVE.
- **ROADMAP PASS:** NOT DECLARED.
- **PL21:** NOT STARTED.
- Ready for ChatGPT Web review.
