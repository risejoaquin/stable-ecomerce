# POST-UX C Iteration 12 HOTFIX 03 — Restore Canonical Vite Baseline

The Iteration 12 HOTFIX 02 applied successfully, but the subsequent build exposed
that the local `vite.config.ts` had regressed to an older configuration:

- runtime `vite-plugin-compression` was active again;
- forced `admin-pages` chunk returned;
- forced `storefront-pages` chunk returned;
- generic vendor grew to ~689.5 kB;
- POST-UX B smoke failed because `selfcare-stable-compression` was missing.

HOTFIX 03 restores the previously validated Vite baseline from POST-UX B and
Iterations 09-11, then keeps Iteration 12's Radix UI transitive isolation.

It also saves the pre-hotfix local config under:
`.tmp/post-ux-c-iteration-12-hotfix-03/vite.config.before-hotfix-03.ts`

No dependency changes. Do not run npm install.
