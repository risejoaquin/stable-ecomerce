# UIX SYSTEM A — Storefront + Home Architecture

## Objetivo

Reordenar la página principal del storefront para que funcione como una experiencia comercial completa, no como una acumulación de secciones visuales.

## Problema corregido

El storefront ya tenía un tema premium, pero la home seguía teniendo mezcla de componentes de etapas anteriores. La corrección organiza la narrativa de compra:

1. Header claro.
2. Hero con propuesta de valor.
3. Trust strip visible.
4. Rutinas recomendadas.
5. Compra por necesidad de piel.
6. Catálogo.
7. Lookbook/editorial.
8. Confianza antes del pago.
9. Newsletter.
10. Footer y mobile nav.

## Reglas de diseño

- Soft Premium Skincare como lenguaje dominante.
- No duplicar nuevos sistemas visuales.
- Usar `uix-soft-premium-system.css` como entrada canónica.
- Mantener analytics centralizado.
- Mantener carrito, checkout, Stripe, Supabase y auth sin cambios críticos.

## Componentes creados

- `UixSectionHeader`
- `UixCard`
- `StorefrontTrustStrip`
- `RoutineCards`
- `ShopByConcern`
- `StorefrontNewsletter`

## Validación esperada

- Home compila.
- No hay imports globales duplicados en `main.tsx`.
- `@import` de CSS queda al inicio del archivo para evitar warning de PostCSS.
- El storefront mantiene catálogo funcional.
- La home tiene jerarquía comercial completa.
