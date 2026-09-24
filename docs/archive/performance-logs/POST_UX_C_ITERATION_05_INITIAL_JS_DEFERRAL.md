# POST-UX C - Iteration 05: Initial JavaScript Deferral

## Evidence

Iteration 04 found a consistent Lighthouse unused-JavaScript opportunity:

- Home/Search: about 129 KiB estimated unused JS
- Product Detail: about 162 KiB estimated unused JS

The audit is much more consistent than image conclusions for Product Detail.

## Strategy

Do not change the stable Vite vendor topology.

Instead, split clearly below-the-fold feature modules with `React.lazy`:

Home:
- RoutineCards
- ShopByConcern
- EditorialLookbookSection
- StorefrontNewsletter

Product Detail:
- ReviewList
- ReviewForm

Each lazy module is wrapped in a narrow `Suspense` boundary.

## Preserved contracts

- React/ReactDOM/React Router/lucide stable vendor grouping
- Product primary LCP priority
- Product secondary request deferral
- Home hero priority rollback
- service worker
- checkout/Stripe
- auth
- UTF-8 integrity

## Encoding rule

The patcher is ASCII-only and reads/writes TSX with explicit UTF-8 .NET I/O.

## Dependencies

None. Do not run `npm install`.

## Validation

After build and regression smokes, compare:
1. generated chunk topology,
2. Lighthouse unused-JS opportunity,
3. 3-run medians for Home/Search/Product mobile and desktop.
