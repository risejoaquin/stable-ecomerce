# POST-UX C - Iteration 11: Recharts Dependency Isolation

## Evidence

Iteration 10 showed that the protected `vendor` chunk still contains several
large packages that are not part of the protected React/Router/lucide set.

The package-lock confirms that Recharts 3.9.2 directly depends on:

- @reduxjs/toolkit
- decimal.js-light
- es-toolkit
- eventemitter3
- immer
- react-redux

Their transitive Redux dependencies also include:

- redux
- redux-thunk
- reselect
- use-sync-external-store

Because the current Vite rule only matches `recharts`, `d3-*` and
`victory-vendor`, these dependencies fall through into the generic `vendor`
chunk.

## Change

Expand `vendor-charts` to include the confirmed Recharts dependency graph.

## Protected contracts

The following stay together in the stable vendor chunk:

- react
- react-dom
- react-router
- react-router-dom
- lucide-react

No changes to:

- vendor-query
- vendor-ui
- vendor-commerce
- vendor-observability
- route-level chunking
- service worker
- checkout
- auth

## Expected result

The initial storefront vendor chunk should shrink materially, while
`vendor-charts` grows. Since storefront routes no longer load charts after
Iteration 09, those chart dependencies should no longer be requested on
Home/Search/Product.

## Dependencies

None. Do not run `npm install`.
