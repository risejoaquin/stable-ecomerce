# POST-UX C HOTFIX 19.1 — Partial application repair

HOTFIX 19 failed after partially modifying the working tree.

## Root causes

1. The HOTFIX 19 generic patch helper treated an empty replacement string as an
   "already applied" marker. Since every JavaScript string contains `""`, the
   `useValidateCoupon` removal was always skipped.
2. The ProductDetailPage toast import replacement required one exact source
   spelling and failed when the local source did not match it exactly.

## Repair

HOTFIX 19.1 is intentionally idempotent and recovery-oriented.

- removes `useValidateCoupon` with a regex instead of an empty-string marker;
- accepts named or default `react-hot-toast` imports;
- tolerates CRLF/LF line endings;
- preserves HOTFIX 19 changes already applied to `App.tsx` and `useCheckout.ts`;
- verifies the final state before returning PASS.

This is a repair of HOTFIX 19, not a new performance experiment.
