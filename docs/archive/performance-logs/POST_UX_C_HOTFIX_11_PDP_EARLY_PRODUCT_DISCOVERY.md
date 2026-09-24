# POST-UX C HOTFIX 11 — PDP Early Product Discovery / Critical Data Path

## Evidence

HOTFIX 10 reduced the PDP mobile median LCP from ~6573 ms to ~3749 ms and reduced the LCP image transfer to ~35 KB WebP.

The measured request chain showed, on a representative run:

- product API renderer start: ~548.6 ms
- product API network end: ~1119.7 ms
- LCP image network start: ~1134.2 ms
- API-to-image gap: ~14.4 ms

The image pipeline and React handoff after the product response are therefore not the current primary discovery bottleneck.

## HOTFIX 11 change

The product request now starts from `index.html` as soon as the initial HTML reaches the browser and the URL matches `/product/:uuid/...`, before the React application bundle mounts.

The in-flight promise is stored temporarily on:

`window.__SELFCARE_EARLY_PRODUCT__`

`ProductDetailPage` consumes the same promise through React Query instead of issuing a duplicate request.

Fallback behavior is preserved: if there is no matching bootstrap request, the PDP continues to use the existing API client.

## Guardrails

- no vendor chunk changes
- no routing split changes
- no Sharp/image pipeline changes
- no database/schema changes
- no dependency changes
- HOTFIX 10 responsive WebP behavior remains protected
- reviews/rating/similar-products deferral remains protected

## Validation

Run:

```powershell
.\scripts\qa\apply-post-ux-c-hotfix-11.ps1
.\scripts\qa\smoke-post-ux-c-hotfix-11.ps1
npm run build
```

Then run the existing regression smokes, deploy, and repeat the same 5-run mobile Lighthouse test for the current PDP.

Target remains:

- Performance >= 0.85
- LCP <= 2500 ms
- CLS <= 0.10

Accessibility 0.93 is a separately identified gate and is not modified by this performance-only hotfix.
