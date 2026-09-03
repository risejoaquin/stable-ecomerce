# MOBILE/UX F — Final Visual Regression Closure

## Objetivo
Cerrar la etapa MOBILE/UX con una regresión transversal del sistema visual y responsive ya implementado en A–E, sin reabrir contratos de negocio.

## Cobertura final
- Storefront y catálogo.
- Product detail y cart drawer.
- Auth, account, profile, wishlist, orders, recover cart, reset password y tracking.
- Checkout success y flujo Stripe protegido.
- Admin desktop/tablet/mobile.
- Páginas legales y soporte.
- PWA/service worker y query-param navigation guard.
- Accesibilidad de teclado, foco, reduced motion y touch targets.

## Breakpoints de aceptación
La arquitectura debe permanecer funcional de forma fluida en 320, 360, 375, 390, 412, 430, 640, 768, 820, 1024, 1280 y 1440+ px. No se crean layouts independientes por resolución: se validan los breakpoints existentes y guardrails finales.

## Hardening aplicado en F
- Guard global contra overflow horizontal accidental.
- Skip links para storefront/account/admin.
- Main regions enfocables para navegación por teclado.
- Safe-area inferior en navegación móvil.
- Inputs de 16px en móvil para evitar zoom involuntario en iOS.
- Touch action explícita en controles interactivos móviles.
- Guard de 100dvh en drawer/modal/sheet.
- Fallback específico de 360px para pantallas pequeñas.
- Política `prefers-reduced-motion: reduce`.
- Etiqueta accesible del botón de bolsa en navegación móvil.

## Contratos protegidos
MOBILE/UX F no modifica endpoints, Stripe, auth, email queue, analytics, service worker, lazy routes ni reglas de negocio. Los smoke B–E continúan siendo gates regresivos obligatorios.

## Gate de cierre
1. `smoke-mobile-ux-f.ps1` PASS.
2. Smokes E, D, C y B PASS.
3. `npm run build` PASS.
4. GitHub/versionado PASS.
5. Railway deploy PASS.
6. `smoke-mobile-ux-f.ps1 -BaseUrl https://selfcaresinners.com` PASS.
7. `smoke-qa-release-e.ps1 -BaseUrl https://selfcaresinners.com` PASS.

Cuando todos los gates pasen, MOBILE/UX A–F puede declararse 100% CLOSED / PASS.
