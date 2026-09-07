# POST-UX C Iteration 12 HOTFIX 08 — Fix PDP Runtime Declaration Order

Fresh Lighthouse LCP insight showed the measured LCP node was the ErrorBoundary text:
"Ha ocurrido un error inesperado en la aplicación..."

Inspection of `ProductDetailPage.tsx` confirmed:
`useProductRating(secondaryContentReady ? ...)`
executed before the `secondaryContentReady` state declaration.

Because `const` variables are in the JavaScript temporal dead zone before initialization,
this can throw a runtime ReferenceError during render and route the page into ErrorBoundary.

This hotfix only moves the `secondaryContentReady` state declaration before its first use.

No dependency changes.
No Vite changes.
No Sentry/Radix changes.
Do not run npm install.
