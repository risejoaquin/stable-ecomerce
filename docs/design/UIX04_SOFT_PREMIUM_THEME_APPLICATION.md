# UIX04 — Soft Premium Skincare Theme Application

## Decisión visual

Se aplica el tema aprobado por el usuario al storefront completo y al panel de administración.
La dirección visual queda como:

- fondo cálido ivory/beige
- fotografía de producto protagonista
- tarjetas suaves con borde sutil
- tipografía serif elegante en headings
- botones oscuros de alto contraste
- microcopy claro y confiable
- mobile-first con navegación limpia
- dashboard de perfil desglosado por módulos
- admin panel visualmente alineado con la marca

## Alcance aplicado

### Storefront público

- Home
- Header/nav
- Catálogo/product cards
- Product detail
- Cart drawer
- Trust sections
- Mobile nav
- Empty/loading states visuales

### Perfil de cliente

Se reemplaza el perfil básico por un dashboard completo con:

- resumen de cuenta
- puntos/rewards
- pedidos recientes
- sugerencias de recompra
- wishlist/favoritos
- cupones
- direcciones editables
- métodos de pago
- soporte/devoluciones
- notificaciones
- preferencias y seguridad

### Panel de administración

Se aplica el mismo lenguaje visual al admin sin alterar lógica:

- layout lateral
- header
- tarjetas
- métricas
- tablas
- formularios
- inputs
- botones
- bordes/radios/sombras
- tono visual coherente con storefront

## Archivos modificados

- `src/main.tsx`
- `src/styles/soft-beauty-theme.css`
- `src/pages/store/HomePage.tsx`
- `src/pages/store/ProductDetailPage.tsx`
- `src/pages/store/ProfilePage.tsx`
- `src/components/editorial/EditorialHeader.tsx`
- `src/components/editorial/EditorialProductCard.tsx`
- `src/App.tsx`

## No se modifica

- Stripe
- webhooks
- órdenes
- Supabase
- migraciones
- auth
- backend crítico

## Validación esperada

El sitio debe dejar de sentirse como página web básica y pasar a una experiencia premium tipo skincare/DTC:

- más limpia
- más cálida
- más confiable
- más mobile-first
- más profesional
- más coherente entre tienda, perfil y admin
