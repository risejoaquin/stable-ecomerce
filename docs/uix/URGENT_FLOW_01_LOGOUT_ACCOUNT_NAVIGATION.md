# URGENT-FLOW-01 — Logout + Account Navigation Discoverability

## Motivo

Antes de continuar el roadmap por macrofases, se detectó un bloqueo de UX funcional: el usuario no tenía un acceso claro para cerrar sesión y el icono de perfil no permitía desplegar los apartados disponibles.

## Problema

- El storefront tenía acceso visual a `/profile`, pero no un menú real de cuenta.
- En desktop, el usuario necesitaba ver apartados como pedidos, wishlist, direcciones, pagos, rewards, soporte/configuración y cerrar sesión.
- En mobile, el acceso de cuenta no debía navegar directo: debía abrir un bottom sheet navegable.
- El botón de cerrar sesión existía en `AuthMock.UserButton`, pero ese componente no estaba conectado al header editorial actual.

## Corrección

Se agregó:

- Dropdown de cuenta en desktop.
- Bottom sheet de cuenta en mobile.
- Botón visible de cerrar sesión en ambos flujos.
- Acceso a admin solo si `role === 'admin'`.
- Cierre por click fuera y tecla Escape en desktop.
- Cierre por overlay y Escape en mobile.
- Limpieza de `auth_token` y `guest_email` al cerrar sesión.

## Flujos revisados

### Desktop

1. Usuario autenticado ve `Cuenta`.
2. Click en `Cuenta` abre dropdown.
3. Dropdown muestra apartados principales.
4. Click en `Cerrar sesión` borra token y vuelve al home.
5. Admin ve acceso a `/admin`.
6. Usuario normal no ve acceso admin.

### Mobile

1. Usuario autenticado toca `Cuenta` en navegación inferior.
2. Se abre bottom sheet.
3. Muestra apartados principales.
4. `Cerrar sesión` está visible al final.
5. Tap fuera o botón X cierra el sheet.

## Archivos modificados

- `src/components/editorial/EditorialHeader.tsx`
- `src/components/editorial/MobileEditorialNav.tsx`
- `src/styles/soft-beauty-theme.css`

## Validación manual esperada

- Desktop: `Cuenta` despliega menú.
- Desktop: `Cerrar sesión` visible.
- Desktop: click fuera cierra menú.
- Desktop: Escape cierra menú.
- Mobile: `Cuenta` abre bottom sheet.
- Mobile: `Cerrar sesión` visible.
- Mobile: X/overlay cierra bottom sheet.
- Cerrar sesión elimina sesión y redirige a `/`.
