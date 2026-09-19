# CURRENT TASK

TASK ID: PL20-03A-COST-AGGREGATION-HOTFIX
PHASE: POST-LAUNCH 20
STATUS: READY_FOR_CHATGPT_WEB_VALIDATION (PL20-01 PASS; PL20-02 PASS / CLOSED; PL20-03 AUTHORIZED / ACTIVE; PL20-03A HOTFIX COMPLETE; POST-LAUNCH 20 ACTIVE; PL21 NOT STARTED; finalScaleReady EXPECTED FALSE)

## Objective

Remediate cost aggregation semantics so shared/unallocated or unknown provider costs cannot be presented as ecommerce-attributable total cost:
1. **Shared Account Cost Separation:** Railway 192 MXN across 4 hosts retained as infrastructure shared evidence in metadata (`shared_account_costs: { railway: 192 }`, `shared_unallocated_amounts: { railway: 192 }`). Attributable provider `amount` is explicitly `null` (not 192, not divided by 4 to 48).
2. **`measured_provider_total`:** Strictly aggregates only providers with `measured_state === 'MEASURED'` and numeric amount.
3. **`total_estimate` Semantics:** Set to `measured_provider_total` ONLY when all four core providers (Railway, Supabase, Stripe, Resend) are `MEASURED`. If any provider is `PARTIAL` or unallocated, `total_estimate` evaluates strictly to `null`.
4. **Metadata Transparency:** Breakdown includes `unallocated_providers`, `unknown_amount_providers`, `partial_provider_amounts`, and `partial_known_amounts`.
5. **Period Boundary Convention:** `getMonthPeriodBounds(periodStr)` establishes inclusive calendar month boundaries (`YYYY-MM-01` to actual last day of month `YYYY-MM-28/29/30/31`).
6. **Resend Caveat Clean-up:** Removed unverified `"up to 3,000 emails/month"` volume claim.
7. **Quality & Scale Constraints:** `finalScaleReady` remains strictly `false`. PL20-03 remains ACTIVE; PL21 NOT STARTED.

## Files modified

- `server.ts`
- `tests/api/functional-quality-contracts.test.ts`
- `AGENT_CONTEXT/06_CURRENT_TASK.md`
- `AGENT_CONTEXT/07_HANDOFF.md`
- `AGENT_CONTEXT/08_LAST_VALIDATION.md`
- `AGENT_CONTEXT/13_CHANGELOG.md`
- `AGENT_CONTEXT/evidence/post-launch-20/2026-09-19-pl20-03a-cost-aggregation-hotfix.md`

## Verification Summary

- `npm run lint`: PASS (0 errors)
- `npm test`: PASS (122/122 tests passed across 4 files, 105 in `functional-quality-contracts.test.ts`)
- `npm run build`: PASS (Vite client + esbuild server bundle)
- `npm run test:e2e`: PASS (20/20 Playwright E2E tests)
- `npm run qa:release` (`.\scripts\qa\validate-release.ps1`): FINAL RESULT PASS (8/8 gates passed)
- `git diff --check`: PASS (0 whitespace errors)
