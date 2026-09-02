# UIX04.2 — Admin organization, cart icon visibility and homepage structure hotfix

## Objetivo

Corregir tres detalles visuales detectados después de aplicar el tema Soft Premium Skincare:

1. El panel de administración no se percibía bien organizado.
2. El icono de carrito podía verse completamente negro o sin contraste suficiente.
3. La página principal necesitaba mejor jerarquía y organización visual.

## Cambios realizados

### Admin dashboard

Se reorganizó `src/pages/admin/AdminDashboard.tsx` para convertirlo en un command center visual:

- Hero ejecutivo con estado de operación e ingresos del día.
- Alertas operativas separadas como prioridad.
- Bloque de salud operativa.
- Bloque de KPIs comerciales.
- Gráficas agrupadas.
- Paneles inferiores separados por órdenes, inventario, webhooks, productos, cupones y auditoría.
- Mensajes vacíos más claros.

### Admin layout

Se mejoró `AdminLayout` en `src/App.tsx`:

- Sidebar agrupado por secciones: Command center, Operación, Catálogo y Crecimiento.
- Header de administración con etiqueta de panel organizado.
- Sidebar con tarjeta visual de consola.

### Carrito

Se reforzó `src/styles/soft-beauty-theme.css`:

- El botón de bolsa/carrito ahora tiene estado normal beige con texto/icono visibles.
- Hover con fondo oscuro e icono blanco.
- SVG de carrito, cuenta, wishlist y mobile nav con `stroke: currentColor` y `fill: none`.
- Se evita que el icono quede negro sin contraste.

### Home principal

Se agregó una estructura antes del catálogo:

- Bloque de 3 beneficios principales.
- Bloque editorial de experiencia principal.
- Mejor transición entre hero y catálogo.
- Mejor narrativa: propuesta de valor → confianza → compra.

## Archivos modificados

- `src/pages/admin/AdminDashboard.tsx`
- `src/App.tsx`
- `src/pages/store/HomePage.tsx`
- `src/styles/soft-beauty-theme.css`
- `scripts/qa/smoke-uix04-2-admin-home-cart.ps1`

## Validación esperada

- El admin debe sentirse organizado por prioridad y por área operativa.
- El carrito debe verse con contraste correcto en desktop y mobile.
- La home debe sentirse más ordenada y menos como una página básica.
- No se tocó Stripe, órdenes, webhooks, Supabase ni backend crítico.
