# POST-UX C - Iteration 12: Radix UI Dependency Isolation

## Evidence

After Iteration 11, the remaining protected vendor still contains non-protected
UI transitive dependencies:

- react-remove-scroll
- aria-hidden
- react-remove-scroll-bar
- use-callback-ref
- use-sidecar
- react-style-singleton

The package lock confirms that Radix Dialog depends on `aria-hidden` and
`react-remove-scroll`, and the scroll-control graph depends on the remaining
packages above.

## Change

Expand `vendor-ui` to include the confirmed Radix UI transitive dependency
graph.

## Protected contracts

Still unchanged and kept together:

- react
- react-dom
- react-router
- react-router-dom
- lucide-react

Also unchanged:

- react-helmet-async remains in generic vendor for now
- vendor-query
- vendor-charts
- vendor-commerce
- vendor-observability
- route-level lazy chunks
- auth
- checkout
- service worker

## Expected result

The generic storefront vendor should shrink again, with the UI-only transitive
dependencies moving into `vendor-ui`.

Because vendor-ui is already part of the application UI path, this change is
primarily about reducing contamination and improving tree/chunk attribution.
We will judge performance only after fresh production Lighthouse runs.

## Dependencies

None. Do not run `npm install`.
