# UIX03 — Implementation Plan

## Next implementation macrofase
MACRO UI D — SKOOT-inspired Editorial Storefront Redesign Implementation

## Files planned
- src/styles/skoot-editorial-redesign.css
- src/components/editorial/SkootInspiredHeader.tsx
- src/components/editorial/EditorialHero.tsx
- src/components/editorial/EditorialProductCard.tsx
- src/components/editorial/EditorialProductGrid.tsx
- src/components/editorial/EditorialLookbookSection.tsx
- src/components/editorial/EditorialFooter.tsx
- src/components/editorial/MobileEditorialNav.tsx
- docs/design/MACRO_UI_D_SKOOT_INSPIRED_EDITORIAL_STOREFRONT_REDESIGN.md
- scripts/qa/smoke-ui-d-visual-checklist.ps1

## Implementation order
1. Add editorial CSS tokens.
2. Add new editorial components without deleting old ones.
3. Wire Home to use editorial components.
4. Wire product cards and catalog presentation.
5. Wire product detail visual shell.
6. Validate mobile.
7. Keep checkout stable from MACRO UI B/C.

## Risk control
- Do not change payment logic.
- Do not change database schema.
- Do not change Stripe/webhooks.
- Do not remove existing product hooks.
- Keep build validation mandatory.

## Expected outcome
Selfcare Sinners should stop looking like a basic ecommerce page and start feeling like an editorial skincare/beauty brand inspired by SKOOT's high-impact commerce aesthetic.
