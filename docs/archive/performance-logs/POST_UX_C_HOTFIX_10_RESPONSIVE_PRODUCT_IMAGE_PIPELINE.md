# POST-UX C HOTFIX 10 — Responsive Product Image Pipeline

## Trigger

Supabase Image Transformations returned:

`403 FeatureNotEnabled`

The application therefore cannot depend on Supabase's dynamic render endpoint.

## Architecture

Product uploads now use a dedicated authenticated admin endpoint:

`POST /api/upload/product-image`

The server:

1. Preserves the original upload in the existing public `products` bucket.
2. Reads dimensions with Sharp.
3. Generates WebP variants at 480, 800 and 1200 px when those widths do not exceed the source width.
4. Stores the files under a deterministic path:
   `responsive/<uuid>/w<sourceWidth>/...`
5. Returns the largest optimized variant as the normal `url`.

No product schema or database migration is required. `product.images[]` continues to contain plain URL strings.

The PDP recognizes only the deterministic responsive URL format and derives `srcset`, `sizes`, and the original fallback. Legacy URLs remain untouched.

## Dependency change

Adds `sharp ^0.35.4`.

This HOTFIX changes dependencies, so run `npm install` after applying it. The resulting `package-lock.json` must be committed.

`bun.lock` must remain absent.

## No backfill

The prior product was intentionally deleted. HOTFIX 10 does not contain a migration or catalog backfill.

Only images uploaded after deployment through the product admin form receive responsive variants.

## Protected behavior

- Existing generic `/api/upload` remains unchanged.
- Existing product schema remains unchanged.
- Existing Supabase bucket remains `products`.
- Original image is preserved.
- PDP keeps `fetchPriority="high"`, `loading="eager"`, `decoding="async"`.
- Reviews/rating/similar product deferral remains.
- Vite/manualChunks/Sentry/Radix are not changed.
