# ACCOUNT FLOW A — Roles, Registration and Profile Data Integrity

## Objetivo

Cerrar inconsistencias detectadas después del cierre de producción:

- Definir qué debe ver cada rol.
- Evitar que el registro use `alert()` del navegador.
- Alinear la página de verificación de correo al nuevo UIX premium.
- Evitar que el perfil del usuario mezcle datos reales con datos demo/estáticos.
- Mantener el flujo admin protegido solo por rol `admin`.

## Matriz de roles

| Rol | Qué debe ver | Qué no debe ver |
| --- | --- | --- |
| Guest | Home, catálogo, producto, FAQ, contacto, login/registro, tracking público | Perfil, wishlist privada, pedidos privados, admin |
| User | Perfil, pedidos reales, wishlist real, direcciones, soporte | Panel admin, métricas admin, navegación admin |
| Admin | Todo lo de user + panel de administración | Nada de datos mock de usuario final |

## Cambios aplicados

### Registro

El modal ya no usa `alert()` del navegador. El registro y recuperación muestran mensajes inline con `role="status"`.

### Verificación de correo

`VerifyEmailPage` ahora usa `UixPageShell`, textos en español y tarjetas premium. Ya no muestra la página vieja gris/blanca.

### Correos

`email-templates.ts` fue actualizado al layout Soft Premium para verificación, pedido confirmado, cupón, carrito abandonado y actualización de pedido.

### Perfil de usuario

`ProfilePage` ya no muestra:

- pedidos estáticos como `#SS10458`;
- envíos ficticios;
- tarjetas ficticias `4242`/`1111`;
- puntos y cupones estáticos;
- tickets o notificaciones mock.

Ahora usa:

- `/api/profile` para datos de perfil;
- `/api/orders/my` para pedidos reales;
- `useWishlist()` para favoritos reales;
- empty states cuando no existe información real.

### Roles

`useUserSafe` ya no devuelve siempre `Local Admin`. Lee el token y normaliza:

- sin token: guest;
- token con role admin: admin;
- cualquier otro token: user.

## Decisión técnica

No se agregó un sistema nuevo de permisos. Esta fase solo corrige exposición visual/flujo y evita mezcla de datos. La autorización de backend admin sigue dependiendo de `requireAuth()` + `requireAdmin()` donde aplica, y el guard visual usa `role === 'admin'`.
