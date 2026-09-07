# UIX SYSTEM C — Full Storefront/Admin/Profile Consistency Polish

## Objetivo

Cerrar consistencia visual y funcional entre storefront, perfil, wishlist, pedidos, FAQ, carrito y admin para que la interfaz no se sienta parchada por hotfixes.

## Alcance

- Estados visuales unificados: loading, empty, error, success.
- Shell público unificado con header, mobile nav y cart drawer.
- Mis pedidos alineado al tema Soft Premium Skincare.
- Wishlist alineada al tema Soft Premium Skincare.
- FAQ alineada al tema Soft Premium Skincare.
- Badges de estado unificados.
- Botones primarios/secundarios reutilizables.
- Responsive polish para pantallas de cuenta y soporte.

## Decisiones

1. No tocar lógica crítica de Stripe, Supabase, auth o webhooks.
2. No crear otra hoja visual paralela; todo se agrega al CSS canónico `uix-soft-premium-system.css`.
3. Reutilizar `EditorialHeader`, `MobileEditorialNav` y `CartDrawer` desde `UixPageShell`.
4. Evitar duplicar empty/loading/error states por pantalla.

## Pantallas impactadas

- `/my-orders`
- `/wishlist`
- `/faq`
- Layout compartido de páginas públicas/account.

## Validación esperada

```txt
PASS UIX page shell exists
PASS UIX state panel exists
PASS UIX status badge exists
PASS my orders uses UIX page shell
PASS wishlist uses UIX page shell
PASS FAQ uses UIX page shell
PASS customer loading state centralized
PASS empty state centralized
PASS order status badge centralized
PASS UIX System C CSS marker exists
PASS UIX System C documentation exists
```
