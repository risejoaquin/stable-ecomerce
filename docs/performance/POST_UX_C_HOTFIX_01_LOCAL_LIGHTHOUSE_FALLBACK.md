# POST-UX C HOTFIX 01 — Local Lighthouse Fallback

## Cause

The unauthenticated PageSpeed Insights API returned HTTP 429 for every request, including the first request in the run.

That is an external quota/rate-limit condition and is not evidence of a production performance regression.

## Correction

POST-UX C now has two independent measurement channels:

1. `measure-post-ux-c.ps1`
   - PageSpeed Insights API
   - useful for PSI and CrUX field data
   - can accept an API key

2. `measure-post-ux-c-local.ps1`
   - Lighthouse CLI executed transiently with `npx`
   - does not modify `package.json` or `package-lock.json`
   - captures reproducible lab metrics locally
   - stores raw reports under `.tmp/post-ux-c-local`

A separate helper, `discover-post-ux-c-product.ps1`, resolves a real public Product Detail route from `/api/products`. The placeholder `/product/ID_REAL` must not be used as evidence.

## Dependency policy

No project dependency is added. `npm install` is not required.

The first `npx lighthouse` execution may download Lighthouse into the npm execution cache. This is transient tooling and does not modify the project's dependency manifest or lockfile.

## Interpretation

Local Lighthouse provides lab metrics such as LCP, CLS and TBT.

INP remains a field metric and should come from CrUX/PageSpeed field data when that data is available. TBT must not be treated as INP.
