# POST-UX C Iteration 12 HOTFIX 09 — PDP Discovery Path Optimization

## Evidence

Production Lighthouse traces showed:

- ProductDetailPage route chunk discovered after the generic vendor chunks.
- `/api/products/{id}` could not begin until the ProductDetailPage module was loaded and mounted.
- The LCP image request started only after the product API returned its image URL.
- The LCP image itself already has `fetchPriority="high"`, `loading="eager"`, and `decoding="async"`.
- The image transfer duration was roughly 0.4–0.6 s, while resource load delay was roughly 1.2–1.4 s.
- ProductDetailPage was only about 3.9 KiB gzip as a standalone route chunk.

## Change

1. Import `ProductDetailPage` directly in `src/App.tsx`.
2. Use `ProductDetailPage` directly for both product routes.
3. Remove `LazyProductDetailPage` from `src/routes/lazy-routes.tsx`.
4. Add an HTML `preconnect` for the Supabase Storage origin used by product images.

## Explicitly unchanged

- No dependency changes.
- No `npm install`.
- No API/database changes.
- No image conversion yet.
- No vendor/manualChunks changes.
- No Sentry changes.
- No Radix changes.
- Existing PDP deferred rating/similar-products behavior remains.
- ReviewList and ReviewForm remain lazy.
- Primary PDP image remains high-priority/eager/async.

## Validation objective

Reduce the PDP mobile LCP discovery chain before considering physical image optimization (WebP/AVIF/srcset).
