# POST-UX C HOTFIX 19.2 — Toast vendor isolation

## Why 19 was not sufficient

HOTFIX 19/19.1 successfully removed eager `react-hot-toast` imports from App,
PDP and checkout, and deferred Toaster mounting.

However, the build still reported:

- core vendor: 269079 bytes
- `_goober` present in core vendor

Reason: `goober`, a transitive dependency of `react-hot-toast`, was not covered
by the toast grouping and therefore fell through to the generic `vendor`.

## Change

Add a dedicated `vendor-toast` manual chunk for:

- `/react-hot-toast/`
- `/goober/`

This rule executes before `vendor-ui`.

## Safety

The proven stable core remains unchanged:

- React
- React DOM
- React Router
- React Router DOM
- lucide-react

No dependencies change. No server/API/CSP/SEO/image/CSS behavior changes.

## Expected build result

- `vendor-toast-*.js` exists.
- `_goober` absent from the core vendor.
- `_goober` present in `vendor-toast`.
- core vendor smaller than 269079 bytes.
- stable React/Router/Lucide contracts remain PASS.
