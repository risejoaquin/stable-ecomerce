# POST-UX C - Iteration 09: Natural Admin Dependency Boundaries

## Evidence

After restoring natural storefront route chunks, Lighthouse showed storefront
pages downloading code they should not need:

- vendor-charts: about 84.7 KiB transferred, about 73.6 KiB wasted (~86.9%)
- admin-pages: about 21.3 KiB transferred, about 20.7 KiB wasted (~97.3%)

The build also emitted:

`Circular chunk: email-admin -> admin-pages -> email-admin`

## Root cause hypothesis

The route definitions are already lazy via `React.lazy` + dynamic `import()`,
but Vite manual chunk rules forcibly merge admin route modules into
`admin-pages` and admin email modules into `email-admin`.

Those artificial boundaries can create cross-chunk dependencies and cycles
that cause unrelated storefront routes to preload admin/chart assets.

## Change

Remove only the manual chunk assignments for:

- `/src/pages/admin/`
- `/src/server/email/` and `/src/hooks/useAdminEmail`

Natural Rollup/Vite dependency boundaries are restored.

## Protected contracts

Unchanged:

- React / ReactDOM / React Router / react-router-dom / lucide-react stable vendor
- vendor-query
- vendor-charts
- vendor-commerce
- vendor-observability
- vendor-ui
- service worker
- auth
- Stripe/checkout

## Expected result

- no `email-admin -> admin-pages -> email-admin` circular chunk warning
- admin route chunks become route-specific/natural
- storefront pages stop loading `admin-pages`
- ideally `vendor-charts` is no longer requested on Home/Product/Search

## Dependencies

None. Do not run `npm install`.
