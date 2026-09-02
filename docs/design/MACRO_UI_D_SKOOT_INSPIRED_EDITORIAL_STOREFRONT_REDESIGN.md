# MACRO UI D — SKOOT-inspired Editorial Storefront Redesign Implementation

## Objetivo

Cambiar la tienda de una experiencia ecommerce básica a una experiencia editorial de alto impacto inspirada en patrones visuales de SKOOT, adaptada a Selfcare Sinners como marca de skincare/beauty.

## Principios de implementación

- Inspiración visual, no copia literal.
- Mantener identidad Selfcare Sinners.
- No tocar pagos, órdenes, Stripe, Supabase ni webhooks.
- Priorizar storefront público: home, catálogo, cards, producto, lookbook, footer y mobile nav.
- Mantener compatibilidad con el flujo técnico validado hasta PL35.

## Cambios principales

- `src/styles/skoot-editorial-redesign.css`
- `src/components/editorial/EditorialHeader.tsx`
- `src/components/editorial/EditorialProductCard.tsx`
- `src/components/editorial/EditorialLookbookSection.tsx`
- `src/components/editorial/EditorialFooter.tsx`
- `src/components/editorial/MobileEditorialNav.tsx`
- `src/pages/store/HomePage.tsx`
- `src/pages/store/ProductDetailPage.tsx`

## Resultado esperado

La tienda debe sentirse más editorial, más fuerte visualmente, menos genérica, más mobile-first y más cercana a una marca real de beauty/skincare.
