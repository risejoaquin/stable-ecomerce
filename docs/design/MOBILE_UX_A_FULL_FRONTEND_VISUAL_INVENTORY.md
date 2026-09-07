# MOBILE/UX AUDIT A — Full Frontend Visual Inventory

## Estado

AUDIT COMPLETE — BASELINE READY FOR MOBILE/UX B

## Objetivo

Inventariar el estado visual/frontend real del repositorio posterior a ACCOUNT/FLOW A y separar claramente:

- superficies ya alineadas al sistema Soft Premium / Editorial;
- superficies parcialmente migradas;
- superficies legacy o con deuda visual/contenido;
- riesgos responsive/mobile;
- deuda de consistencia de estados loading/empty/error/success;
- prioridades de corrección sin reabrir fases funcionales cerradas.

Esta fase es de auditoría. No modifica flujos de auth, checkout, email queue, service worker, Stripe ni contratos backend.

## Baseline protegido

No romper ni rediseñar desde cero:

- Home editorial.
- Product detail editorial.
- Login UIX premium.
- Profile / My Orders / Wishlist UIX.
- Admin Command Center.
- Admin Email Center.
- Email production pipeline.
- Lazy routes / React Suspense.
- Service worker guard ya corregido.
- Configuración Vite que eliminó el circular vendor chunk.

## Clasificación global

### A — Actualizado / sistema nuevo predominante

| Superficie | Estado | Evidencia principal | Acción |
|---|---|---|---|
| Home | A | EditorialHeader, MobileEditorialNav, StorefrontTrustStrip, RoutineCards, ShopByConcern, StorefrontNewsletter | Preservar; validar breakpoints reales |
| Product detail | A | EditorialHeader + layout editorial + mobile nav | Preservar; validar gallery/CTA móvil |
| Login/Register/Forgot | A | AuthMock + modal UIX premium | Preservar; QA móvil real |
| Verify email | A | UixPageShell | Preservar; unificar estados si aplica |
| Profile | A | UixPageShell + UixStatePanel | Preservar; QA forms/touch |
| My Orders | A | UixPageShell + UixStatePanel | Preservar; QA cards/acciones |
| Wishlist | A | UixPageShell + UixStatePanel | Preservar; QA grid/touch |
| FAQ | A | UixPageShell | Preservar; QA accordions/spacing |
| Admin Dashboard | A | Command Center UIX | Preservar; fortalecer tablet/mobile |
| Admin Email Center | A | UIX admin/email system | Preservar; validar tablas/paneles en móvil |
| Cart drawer | A- | premium-cart-* + checkout confidence | Preservar lógica; QA 320–430px y teclado móvil |

### B — Parcialmente actualizado / mezcla de sistemas

| Superficie | Estado | Hallazgo | Acción |
|---|---|---|---|
| Checkout success | B | conversion classes nuevas, pero sin shell UIX/editorial común | Integrar shell y estados consistentes |
| Track order | B | último consumidor de StoreHeader; Tailwind directo abundante | Migrar a Editorial/Uix shell |
| Reset password | B | tarjeta genérica, sin UixPageShell/UixStatePanel | Migrar al auth/account visual system |
| Contact | B | formulario funcional pero visual genérico y placeholder en inglés | Migrar + españolizar |
| Admin Customers | B | responsive parcial; no usa paneles/estados UIX de forma consistente | Migrar estructura |
| Admin Commercial | B | mezcla UIX/Tailwind; strings en inglés | Normalizar |
| Admin Categories | B | casi sin breakpoints propios | Adaptar tablet/mobile |
| Admin Orders | B | página grande con tablas/detalle y estados legacy | Rediseño responsive controlado |
| Admin Products | B | loading en inglés y estructura mínima | Migrar UIX + responsive |
| Admin Settings | B | responsive básico por sm:, sin sistema de estados | Normalizar |
| Coupons | B | loading en inglés + tablas/cards legacy | Migrar UIX + responsive |

### C — Deuda clara / prioridad alta

| Superficie | Estado | Hallazgo | Acción |
|---|---|---|---|
| Recover cart | C | título `Restoring Cart`; diseño genérico; sin shell UIX | Rehacer presentación conservando recuperación funcional |
| Privacy policy | C | contenido principal genérico en inglés + prose/Tailwind legacy | Contenido final ES + legal shell premium |
| Return policy | C | contenido principal genérico en inglés + prose/Tailwind legacy | Contenido final ES + legal shell premium |
| Terms and conditions | C | contenido principal genérico en inglés + prose/Tailwind legacy | Contenido final ES + legal shell premium |
| Not found | C | pantalla mínima fuera del sistema editorial | Integrar shell/CTA de recuperación |

## Navegación y shell

### Header desktop

El sistema editorial usa `EditorialHeader`. Home y Product Detail ya lo consumen. `TrackOrderPage.tsx` sigue usando `StoreHeader`, por lo que existe una bifurcación visual que debe eliminarse.

### Header mobile

`MobileEditorialNav` ofrece Inicio, Tienda, Favoritos, Cuenta y Bolsa. Debe ser el patrón canónico del storefront donde aplique.

Riesgos a validar:

- safe-area inferior en iOS;
- altura disponible con teclado virtual;
- badge/conteo de carrito;
- navegación a wishlist cuando usuario no autenticado;
- scroll de página detrás de sheets/drawers;
- touch targets >= 44 px donde sea razonable.

### Admin navigation

`AdminCommandNav` tiene adaptación CSS a <=1180 y <=760 px, pero en tablet transforma grupos a bloques inline con anchura mínima. Debe probarse overflow horizontal/vertical y probablemente convertirse en navegación compacta/drawer para MOBILE/UX D.

## Carrito / checkout

El cart drawer ya usa `premium-cart-*` y conserva:

- invitado por email;
- cupón;
- subtotal/descuento/total;
- Stripe Checkout;
- CheckoutConfidenceStrip;
- ConversionMicrocopy.

No se debe reescribir lógica. La siguiente fase debe concentrarse en:

- viewport 320/360/390/430 px;
- footer visible con contenido largo;
- teclado virtual en email/cupón;
- scroll interno;
- botones de cantidad y eliminar;
- safe area inferior;
- cierre por scrim y accesibilidad del drawer.

## Búsqueda, catálogo y query params

Home usa el flujo de búsqueda/filtros existente y el service worker ya tiene guard para navegaciones con query params. MOBILE/UX B debe validar visualmente:

- `?search=` con textos largos;
- filtros apilados;
- controles de orden/filtro en 320–430 px;
- tarjetas con nombres largos;
- empty result state;
- loading state;
- paginación;
- no overflow horizontal.

## Estados globales

Existe `UixStatePanel`, pero su adopción es desigual.

### Bien alineados

- Profile
- My Orders
- Wishlist

### Pendientes de normalizar

- Home loading
- Product detail loading/error
- Checkout success loading
- Track order loading/error
- Reset password
- Recover cart
- Contact
- Admin pages secundarias

Objetivo: loading/empty/error/success deben compartir lenguaje visual y texto de Selfcare Sinners, sin mensajes genéricos en inglés.

## Strings visibles a corregir

Hallazgos confirmados en el código auditado:

- `Restoring Cart`
- `Your name`
- `Loading...`
- `Loading coupons...`
- `Loading orders...`
- `Loading details...`
- `Checkout started`
- mensajes globales `Something went wrong`, `Action successful`, `Failed to fetch data`
- `Creating...` en creación de tienda
- contenido completo en inglés en Privacy / Returns / Terms.

Estos textos deben revisarse sin traducir claves técnicas/backend ni eventos analíticos que no sean UI visible.

## Matriz de prioridad

### P0 — Antes de considerar cierre visual

1. Policies legales: Privacy / Returns / Terms.
2. Recover Cart.
3. Reset Password.
4. Track Order / eliminación de StoreHeader legacy.
5. Strings visibles en inglés de storefront/admin.

### P1 — Consistencia funcional/visual móvil

1. Cart drawer + checkout success.
2. Contact.
3. Home catálogo/búsqueda/filtros/query params.
4. Product detail CTA/gallery.
5. Account/Profile/Orders/Wishlist responsive QA.

### P2 — Admin tablet/mobile

1. Orders.
2. Products.
3. Categories.
4. Customers.
5. Coupons.
6. Commercial.
7. Settings.
8. Email Center regression.
9. Command Center regression.

### P3 — Cierre

1. Not Found.
2. estados globales.
3. visual regression 320/360/390/430/768/1024/1280/1440.
4. accessibility/touch/overflow.
5. production smoke.

## Roadmap resultante

### MOBILE/UX AUDIT A — Full Frontend Visual Inventory

Estado: COMPLETE.

Salida: este documento + smoke de inventario.

### MOBILE/UX B — Storefront Mobile Adaptability

Corregir Home, Product Detail, legal, Contact, Track Order, Recover Cart, Reset Password, Checkout Success, búsqueda/filtros, headers, mobile nav y cart drawer sin alterar contratos funcionales.

### MOBILE/UX C — Account/Profile Mobile Adaptability

QA y polish de Auth, Verify Email, Profile, My Orders, Wishlist y flujos de cuenta.

### MOBILE/UX D — Admin Mobile/Tablet Adaptability

Migrar páginas secundarias al sistema UIX y resolver tablas, forms, acciones y navegación en tablet/móvil.

### MOBILE/UX E — Checkout/Cart/Order Flow Mobile QA

Validar recorrido carrito -> guest/auth -> Stripe -> success -> orders -> tracking -> recover cart.

### MOBILE/UX F — Final Visual Regression Closure

Cerrar regressions, breakpoints, accesibilidad, estados globales y smoke producción.

## Criterio de salida de AUDIT A

AUDIT A queda cerrado cuando:

- todas las rutas frontend críticas están clasificadas;
- existe una lista explícita de P0/P1/P2/P3;
- StoreHeader legacy está identificado;
- páginas legales en inglés están identificadas;
- deuda de strings visibles está identificada;
- riesgos mobile de cart/admin/nav están documentados;
- existe roadmap B–F sin modificar arquitectura funcional cerrada.
