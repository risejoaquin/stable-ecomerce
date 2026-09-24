# POST-UX C Iteration 12 HOTFIX 06 — Restore PDP Critical-Path Optimizations

Fresh production measurements showed five valid mobile PDP runs with LCP around
6.64–6.96 seconds. The LCP analyzer consistently identified the ~551 KB Supabase
product image as the largest/slowest image.

Inspection of `src/pages/store/ProductDetailPage.tsx` on `main` showed that several
previously validated POST-UX C optimizations had regressed:

- Iteration 02: product LCP image priority was missing.
- Iteration 02: rating/similar-product secondary requests were no longer deferred.
- Iteration 03: PDP rendering was again blocked by `isStoreLoading || isProductLoading`.
- Iteration 05: ReviewList/ReviewForm had returned to eager imports/rendering.

HOTFIX 06 restores only those validated behaviors.

No dependency changes.
No Vite chunk-rule changes.
No Sentry/Radix changes.
Do not run npm install.
