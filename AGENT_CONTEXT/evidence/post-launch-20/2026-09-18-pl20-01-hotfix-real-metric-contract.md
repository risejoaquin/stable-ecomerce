# PL20-01 HOTFIX: Real Metric Contract & Commercial Query Repair Evidence

**Date:** 2026-09-18
**Phase:** POST-LAUNCH 20 (PL20-01)
**Status:** READY_FOR_CHATGPT_WEB_VALIDATION
**Base Commit:** `5013c311551118639857e08730721097931f7821`

---

## 1. Executive Summary

This hotfix resolves critical blockers identified in PL20-01:
1. **Commercial Orders Query Schema Fix:** Corrected `server.ts` commercial assessment query which previously queried `payment_status` (a column that does not exist in production `orders` table). Replaced with verified columns: `id, total, status, financial_status, paid_at, refunded_amount, refund_status, refunded_at, created_at`.
2. **Deterministic Paid-Like Contract:** Implemented production contract identifying paid-like orders via `paid_at IS NOT NULL OR financial_status IN (paid,reconciled) OR status IN (pagado,empacado,enviado,entregado,partially_refunded)`. Excluded unpaid / canceled orders (`pendiente`, `cancelado`, `payment_failed`, `inventory_exception`).
3. **Real Metric Calculation & Provenance:** Calculated `totalOrders`, `paidCount`, `grossPaidRevenue`, `refundedAmount`, `netPaidRevenue`, and `aov`, embedding full calculation provenance into the assessment evidence JSONB.
4. **Removal of Arbitrary Scores:** Eliminated heuristic/arbitrary numbers (`50 + paidCount * 5`, 100/95/95, 85/85, 90/88/80). All criteria now use `score: null` with explicit `status: 'measured' | 'warning' | 'not_measured' | 'pass' | 'fail'`.
5. **Operating Cost Measured State:** Introduced `measured_state: 'MEASURED' | 'PARTIAL' | 'NOT_MEASURED'` in metadata. Unestimated rows are no longer conflated with measured zero cost.
6. **Strict Evidence-Driven `finalScaleReady`:** `finalScaleReady` requires `isCommercialMeasured`, `isCostEvidenceMeasured`, and `isCapacityLoadMeasured`. Because concurrent load testing and verified provider cost statements are currently `NOT_MEASURED`, `finalScaleReady` evaluates strictly to `false`.
7. **Legacy Seed Isolation:** Filtered out historical seed rows (`metadata.source` containing `'PL20 seed'` or `'026_post_launch_20'`) from active summary counts and evaluation rules.
8. **Permanent Test Suite:** Extended `tests/api/functional-quality-contracts.test.ts` to 12 permanent contract tests covering all above behaviors.

---

## 2. Technical Implementation Details

### A. Paid-Like Order Contract (`server.ts`)
```typescript
const isPaidLike = (order: any): boolean => {
  if (order.paid_at) return true;
  const financialStatus = String(order.financial_status || '').toLowerCase().trim();
  if (['paid', 'reconciled'].includes(financialStatus)) return true;
  const status = String(order.status || '').toLowerCase().trim();
  if (['pagado', 'empacado', 'enviado', 'entregado', 'partially_refunded'].includes(status)) return true;
  return false;
};
```

### B. Commercial Evidence JSONB Provenance
```typescript
const evidencePayload = {
  runKey,
  sourceTable: 'orders',
  calculationVersion: 'pl20-01-hotfix-real-contract',
  measuredAt: new Date().toISOString(),
  windowStart: 'all_time',
  windowEnd: 'all_time',
  paidLikeDefinition: 'paid_at IS NOT NULL OR financial_status IN (paid,reconciled) OR status IN (pagado,empacado,enviado,entregado,partially_refunded)',
  totalOrders,
  paidCount,
  grossPaidRevenue,
  refundedAmount,
  netPaidRevenue,
  aov,
  timestamp: new Date().toISOString()
};
```

### C. Operating Costs `measured_state`
- `MEASURED`: All 4 provider estimates (`railwayEstimate`, `supabaseEstimate`, `stripeEstimate`, `emailEstimate`) explicitly supplied.
- `PARTIAL`: 1 to 3 estimates explicitly supplied.
- `NOT_MEASURED`: No explicit estimates supplied.

### D. Summary `finalScaleReady` Evaluation Rule
```typescript
const isCommercialMeasured = activeCommercial.length > 0 && activeCommercial.some(c => c.assessment_key === 'commercial_volume_performance' && c.status === 'measured');

const isCostEvidenceMeasured = activeCosts.length > 0 && activeCosts.some(c => {
  try {
    const meta = typeof c?.metadata === 'string' ? JSON.parse(c.metadata) : c?.metadata;
    return meta?.measured_state === 'MEASURED';
  } catch {
    return false;
  }
});

const isCapacityLoadMeasured = activeCapacity.length > 0 && activeCapacity.some(c => {
  if (c.capacity_key === 'synthetic_vs_load_testing') {
    return c.status === 'pass' || c.status === 'measured';
  }
  return false;
});

const finalScaleReady = Boolean(
  hasTechnicalEvidence &&
  !hasCriticalTechnicalFailure &&
  !hasCriticalRisk &&
  !hasCriticalDebt &&
  isCommercialMeasured &&
  isCostEvidenceMeasured &&
  isCapacityLoadMeasured
);
```

---

## 3. Local Verification Results

| Check | Command | Exit Code | Result | Details |
|---|---|---|---|---|
| TypeScript Lint | `npm run lint` | 0 | PASS | 0 errors |
| Unit & API Tests | `npm test` | 0 | PASS | 78/78 tests passed (61 in functional-quality-contracts) |
| Production Build | `npm run build` | 0 | PASS | Vite client + esbuild server bundle (627.7kb) |
| E2E Tests | `npm run test:e2e` | 0 | PASS | 20/20 Playwright tests passed |
| Secret Scan | `.\scripts\qa\security\scan-local-secrets.ps1` | 0 | PASS | 0 committed secrets |
| Resend Webhook Auth | `.\scripts\qa\security\validate-resend-webhook-signature.ps1` | 0 | PASS | Signature verification enforced |
| Legacy Upload Auth | `.\scripts\qa\security\validate-legacy-upload-authorization.ps1` | 0 | PASS | Admin authorization enforced |
| Release Gate | `.\scripts\qa\validate-release.ps1` | 0 | PASS | All 8 gates PASS |
| Git Diff Check | `git diff --check` | 0 | PASS | No whitespace/conflict issues |

---

## 4. Test Suite Coverage (`tests/api/functional-quality-contracts.test.ts`)

1. `PL20 admin routes reject unauthenticated guests with 401`
2. `PL20 admin routes reject non-admin authenticated users with 403`
3. `technical assessment sets score: null on all criteria and marks unmeasured load capacity as warning`
4. `commercial assessment query selects production columns and NEVER queries payment_status`
5. `commercial assessment paid-like contract correctly identifies paid orders and computes net metrics`
6. `commercial assessment marks warning and score: null when zero paid commercial orders exist`
7. `capacity assessment sets score: null and marks synthetic load testing as not_measured`
8. `investor readiness assessment sets score: null and marks operating cost transparency as not_measured`
9. `operating costs sets measured_state: NOT_MEASURED when unestimated`
10. `operating costs sets measured_state: MEASURED when all four provider estimates are supplied`
11. `isolates legacy seed rows and derives finalScaleReady === false when capacity and costs are unmeasured`
12. `enforces strict input validation across PL20 endpoints (costs, runKey, roadmap, decision)`
13. `Rule 1: commercial assessment excludes cancelado + reconciled from revenue math, records anomaly conflict, and sets measured_state: PARTIAL`
14. `Rule 2: PARTIAL operating costs do not satisfy finalScaleReady (strict MEASURED required)`
15. `Rule 3: low volume is MEASURED with score: null, and commercial_track_record is warning with score: null`
16. `Rule 4: rejects NOT_APPLICABLE for active production stack components with HTTP 400`
17. `Rule 5: classifies rows lacking complete V1 provenance as HISTORICAL_STATIC_BASELINE`

---

## 5. Provenance & Anomaly Conflict Architecture Rules

1. **Rule 1 (Anomaly Conflict Exclusions):**
   - Any order having canceled status (`cancelado`, `payment_failed`, `inventory_exception`) combined with positive payment indicators (`paid_at` or `financial_status in ('paid', 'reconciled')`) is strictly excluded from `grossPaidRevenue` and `netPaidRevenue`.
   - The anomaly conflict is registered in `evidence.anomalies` with `reason: 'CONFLICT_CANCELED_STATUS_WITH_PAID_FINANCIAL_INDICATOR'`.
   - Sets commercial `measured_state = 'PARTIAL'`.

2. **Rule 2 (`PARTIAL` Costs Contract):**
   - Operating costs marked `PARTIAL` serve only for preliminary operational review.
   - For PL20 final scale ready, required costs must be strictly `MEASURED`.
   - `summary.evaluationRules.isCostEvidenceMeasured` evaluates to `false` when costs are `PARTIAL`, guaranteeing `finalScaleReady === false`.

3. **Rule 3 (Low Commercial Volume Contract):**
   - Clean production orders (even low count) are validly `MEASURED`.
   - No arbitrary order volume threshold is required; no arbitrary numerical scores are assigned (`score: null`).
   - `investor_readiness_checks` sets `commercial_track_record` to `status: 'warning'` and `score: null`, noting that low volume does not invalidate measurement, but multi-quarter cohort scaling remains unproven.

4. **Rule 4 (`NOT_APPLICABLE` Policy):**
   - Core production stack components (Railway, Supabase, Stripe, Resend) and core capacity dimensions are verified active dependencies.
   - Any payload attempting to set their `measured_state` or `status` to `NOT_APPLICABLE` or `N/A` is rejected with HTTP 400.

5. **Rule 5 (V1 Provenance Baseline Standard):**
   - Eliminates fragile prefix/substring matching (`'PL20 seed'`).
   - Valid V1 measured evidence strictly requires complete provenance: `measured_state` + `calculation_version` (`'pl20-01-v1'`) + `measured_at` + `source/source_type`.
   - Incomplete records are classified as `HISTORICAL_STATIC_BASELINE` and tracked in `summary.historicalBaselineRows`.
