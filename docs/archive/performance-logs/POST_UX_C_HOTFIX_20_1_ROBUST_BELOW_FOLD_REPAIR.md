# POST-UX C HOTFIX 20.1 — Robust below-fold PDP deferral repair

HOTFIX 20 failed before modifying the source because its patcher depended on an
exact multi-line JSX string.

HOTFIX 20.1 uses structural anchors instead:

- start: `{similarProducts.length > 0 && (`
- end anchor: `<MobileEditorialNav ...>`

It preserves the entire existing below-the-fold markup byte-for-byte inside the
region and only wraps that region in the existing `secondaryContentReady` gate.

Deferred:
- similar products
- reviews
- EditorialFooter

Preserved outside the gate:
- MobileEditorialNav
- CartDrawer
- first viewport / LCP image / buy panel

No dependencies, Vite chunks, server, CSP, SEO, API, or image pipeline changes.
