# MOBILE/UX B — Storefront Mobile Adaptability

## Estado

IMPLEMENTED — READY FOR USER SMOKE / BUILD / DEPLOY VALIDATION

## Objetivo

Cerrar la adaptabilidad móvil del storefront público sin reescribir contratos funcionales cerrados. Esta fase trabaja únicamente sobre navegación pública, Home, catálogo/búsqueda/filtros, Product Detail, páginas legales, Contact, Not Found y Cart Drawer.

Quedan explícitamente fuera de esta fase y se conservan para MOBILE/UX C/E: Recover Cart, Reset Password, Track Order, Checkout Success, Profile, My Orders, Wishlist y admin.

## Cambios realizados

### 1. Home / catálogo

- Búsqueda y filtros sincronizados con query params de la URL.
- Persistencia de `search`, `category`, `min_price`, `max_price`, `sort_by`, `order` y `page` cuando aplican.
- SearchBar con botón accesible para limpiar búsqueda.
- Controles móviles específicos para abrir/cerrar filtros.
- Conteo de filtros activos.
- ProductFilters migrado a clases UIX y controles táctiles de al menos 48 px.
- Acción explícita `Limpiar filtros`.
- Loading y empty states migrados a `UixStatePanel`.
- Paginación migrada al sistema UIX con `aria-current`, labels y controles touch-friendly.
- Strings editoriales visibles del hero/marquee normalizados al español.

### 2. Product Detail

- Loading y producto inexistente migrados a `UixStatePanel`.
- Layout responsive reforzado para tablet/móvil.
- CTA de compra convertido en superficie sticky en viewport móvil, por encima de la mobile nav.
- Quantity + CTA se apilan correctamente en teléfonos pequeños.
- Se conserva intacta la lógica de variantes, wishlist, reviews y carrito.

### 3. Header / mobile nav

- Se conserva `EditorialHeader` como header canónico de Home/Product Detail.
- Se conserva `MobileEditorialNav` como navegación móvil canónica.
- Se refuerzan tamaños, spacing y ancho del logo para 320–430 px.
- No se modifica AccountMobileSheet ni flujo de autenticación.

### 4. Contact

- Migración a `UixPageShell`.
- Formulario premium responsive.
- Placeholders y mensajes visibles en español.
- `autocomplete` para nombre/correo.
- CTA de envío touch-friendly.
- Se conserva el POST existente a `/api/contact`.

### 5. Privacy / Returns / Terms

- Migración a `UixPageShell` y legal cards premium.
- Contenido visible existente normalizado a español.
- SEO/canonical conservados y mejorados.
- No se agregaron obligaciones legales nuevas; se preservó el alcance conceptual del contenido que ya existía.

### 6. Not Found

- Eliminada pantalla 404 genérica en inglés.
- Integración al shell editorial/UIX.
- CTA de recuperación a la tienda.

### 7. Cart Drawer

Sin reescribir checkout, cupones ni Stripe:

- `role="dialog"` y `aria-modal="true"`.
- Cierre por tecla Escape.
- Bloqueo de scroll de `body` mientras el drawer está abierto.
- Botón cerrar con label accesible.
- Quantity/remove con labels accesibles.
- Full-width drawer en teléfonos pequeños.
- Footer/body adaptados para 320–430 px.
- Controles táctiles y scroll interno preservados.

## Archivos modificados

- `src/App.tsx`
- `src/components/storefront/Pagination.tsx`
- `src/components/storefront/ProductFilters.tsx`
- `src/components/storefront/SearchBar.tsx`
- `src/pages/NotFoundPage.tsx`
- `src/pages/legal/ContactPage.tsx`
- `src/pages/legal/PrivacyPolicyPage.tsx`
- `src/pages/legal/ReturnPolicyPage.tsx`
- `src/pages/legal/TermsAndConditionsPage.tsx`
- `src/pages/store/HomePage.tsx`
- `src/pages/store/ProductDetailPage.tsx`
- `src/styles/uix-soft-premium-system.css`
- `docs/design/MOBILE_UX_B_STOREFRONT_MOBILE_ADAPTABILITY.md`
- `scripts/qa/smoke-mobile-ux-b.ps1`

## Decisiones técnicas

1. No crear un segundo sistema mobile: se reutiliza UIX + Editorial existente.
2. No mover lógica de checkout, Stripe, coupon validation, wishlist, reviews ni APIs.
3. Los filtros se colapsan en móvil sin duplicar estado funcional.
4. Query params se escriben con `replace` para evitar contaminar el historial con cada tecla/filtro.
5. El Cart Drawer se endurece a nivel interacción/accesibilidad, no a nivel contrato.
6. `TrackOrderPage` puede seguir consumiendo `StoreHeader` hasta MOBILE/UX C, ya que el roadmap aprobado ubica esa migración en Account/Profile Mobile Adaptability.

## Riesgos controlados

- SearchBar desktop y mobile comparten el mismo estado de filtros; el debounce puede disparar llamadas equivalentes, pero React Query deduplica por query key.
- CTA sticky de Product Detail debe verificarse visualmente en Safari iOS/Chrome Android para confirmar convivencia con la bottom nav.
- El drawer usa bloqueo de scroll de body; smoke funcional debe comprobar que se restaura al cerrar.
- El contenido legal actual sigue siendo el contenido previo normalizado visual/lingüísticamente; esta fase no sustituye una revisión legal profesional.

## Criterio de cierre

MOBILE/UX B solo puede declararse CLOSED/PASS cuando:

1. `scripts/qa/smoke-mobile-ux-b.ps1` pasa completo.
2. `npm run build` pasa.
3. Git commit/push pasa.
4. Deploy Railway pasa.
5. Smoke de producción contra `https://selfcaresinners.com` pasa.
6. El usuario confirma revisión visual móvil sin regresiones bloqueantes.

## Siguiente fase

`MOBILE/UX C — Account/Profile Mobile Adaptability`
