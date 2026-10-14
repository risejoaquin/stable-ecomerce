# EC-01 — Production Smoke provenance investigation (2026-10-14 T16)

**Status:** PARTIAL; commercial GO=NO-GO. Diagnostic-only work. No production changes.

## Verified evidence
- Repository baseline: `main@b164c8e4f3b8da8ce72b3590eae55b33c33c4d16`.
- Historical failed workflow runs: https://github.com/risejoaquin/stable-ecomerce/actions/runs/38074402623 and https://github.com/risejoaquin/stable-ecomerce/actions/runs/38074522562.
- Both ran on 2026-10-10 with `deployment_status` from `railway-app[bot]`; expected SHA `b164c8e4`, health reported `0bcc9e4e`. Health responded, but strict SHA check failed.
- `.github/workflows/production-smoke.yml` has no deployment environment filter and did not persist event provenance. **Hypothesis**: events from a non-production service/environment could trigger production checks; **not proven**.
- No verified event payload/environment metadata; cannot determine cause or authorize a behavioral change.

## Recovery candidate (not integrated)
- Prior run T15 prepared diagnostic-only provenance instrumentation and Vitest/Node tests in `ECOMMERCE_20261014T15_RECOVERY.zip`; GitHub write was rejected.
- This run re-executed `node --test tests/qa/production-smoke-provenance.test.mjs` on Linux Node 22.16.0 against candidate: **8/8 PASS**.
- Negative control: same tests against baseline workflow after reverse patch: **4/8 PASS, 4/8 FAIL**, proving detection of absent instrumentation.
- PyYAML BaseLoader structural checks: **4/4 PASS**.
- No Vitest, npm lint/build, PowerShell, Windows CI, E2E, smoke or DB test was executed in this run. Candidate is not part of a published SHA.

## Next authorized action
Publish a diagnostic-only workflow change in an isolated branch once write is allowed, run GitHub Actions on that exact SHA, inspect new deployment-status evidence, then decide whether a fail-closed environment filter is appropriate. Do not weaken commit comparison or infer a production PASS.

Commercial MVP scope: boutique storefront/catalogue/variants/cart/orders/admin/manual payment confirmation; excludes POS and social automation. Client01 DR-* contracts remain frozen.
