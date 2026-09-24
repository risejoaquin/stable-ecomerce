# Hotfix E.1 — Service Worker CSP Font Fetch Resilience

## Problem

Chrome console showed a CSP violation from `sw.js` while the service worker attempted to fetch Google Fonts CSS:

```txt
Connecting to https://fonts.googleapis.com/css2?... violates connect-src
Fetch API cannot load https://fonts.googleapis.com/css2?... Refused to connect because it violates CSP
```

The storefront and tracking page were functional, but the browser console still had a production polish issue.

## Fix

- Updated `public/sw.js` to ignore all cross-origin requests.
- Bumped service worker cache name to `selfcare-sinners-static-v2`.
- Added Google Fonts hosts to Helmet `connect-src` as an additional defensive allowance.

## Validation

After deploy:

```txt
GET /sw.js → 200
GET /track → 200
GET /api/orders/track → 200 or 304
No CSP error from sw.js for fonts.googleapis.com
```
