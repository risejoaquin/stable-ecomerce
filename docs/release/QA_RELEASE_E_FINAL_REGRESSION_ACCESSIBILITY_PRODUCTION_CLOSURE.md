# QA/RELEASE E — Final Regression, Accessibility & Production Closure

## Estado objetivo

Cerrar la etapa actual de Selfcare Sinners como una versión comercialmente estable, desplegada y lista para operación continua.

Esta macrofase no introduce nuevas funcionalidades de negocio. Su función es validar que todo lo construido hasta ahora se mantenga coherente, accesible, navegable, desplegable y operable.

## Alcance validado

### Storefront

- Home premium con arquitectura comercial completa.
- Catálogo y cards dentro del sistema UIX.
- Detalle de producto con CTA claro.
- Wishlist alineada al sistema visual.
- Mis pedidos alineado al sistema visual.
- FAQ/Ayuda alineada al sistema visual.
- Carrito con contraste y navegación corregida.
- Header con menú de cuenta centralizado.
- Navegación mobile con bottom sheet de cuenta.

### Admin

- Admin command center organizado por prioridad operativa.
- Navegación admin centralizada.
- Métricas, paneles, listas y alertas con componentes UIX.
- Email Center dentro del admin.
- Rutas admin protegidas según el flujo esperado.

### Email production

- EmailService central.
- Políticas de envío.
- Sanitización HTML.
- request_id y dedupe_key.
- email_queue.
- email_delivery_attempts.
- retry/backoff.
- locking.
- suppression list.
- Resend webhook.
- Admin Email Center.
- Templates premium base.

### Emergency DRY

- Ruta duplicada eliminada.
- Logout centralizado.
- Analytics centralizado con dedupe.
- Race condition de carrito abandonado mitigada con locking.
- CSS consolidado.
- Menú de cuenta y tipos consolidados.

### Performance

- Lazy loading de rutas.
- Suspense de React.
- Admin y Email Center cargados bajo demanda.
- manualChunks configurado.
- Performance budget documentado.

## Criterios de cierre

La versión se considera cerrada cuando:

1. `smoke-qa-release-e.ps1` pasa completo.
2. `npm run build` pasa completo.
3. Railway despliega correctamente.
4. No hay errores críticos en consola del navegador durante navegación manual.
5. Los flujos de usuario principales pueden recorrerse manualmente.
6. Los flujos admin principales son accesibles por admin.
7. El sitio no presenta scroll horizontal en mobile.
8. Los estados loading/empty/error/success usan componentes UIX centralizados.
9. Las rutas críticas de email/admin están protegidas.
10. El reporte final queda documentado.

## Flujos manuales finales

### Cliente anónimo

- Abrir home.
- Navegar catálogo.
- Abrir producto.
- Agregar al carrito.
- Abrir/cerrar carrito.
- Ir a checkout.
- Abrir FAQ/contacto/legal.

### Cliente autenticado

- Abrir menú de cuenta desktop.
- Abrir bottom sheet de cuenta mobile.
- Ver perfil.
- Ver pedidos.
- Ver wishlist.
- Ver direcciones/pagos/configuración si existen.
- Cerrar sesión.

### Admin

- Login como admin.
- Abrir `/admin`.
- Revisar command center.
- Abrir productos.
- Abrir órdenes.
- Abrir clientes.
- Abrir cupones.
- Abrir Email Center.
- Revisar diagnóstico email.

## Pendientes no bloqueantes conocidos

- `npm audit` reporta vulnerabilidades pendientes de revisar en una fase controlada de dependencias.
- El bundle ya fue dividido, pero todavía debe monitorearse con tráfico real.
- `vite-plugin-compression` en Windows muestra rutas absolutas en logs locales; no ha bloqueado build ni Railway.

## Resultado esperado

`QA/RELEASE E` debe cerrar esta etapa como:

```txt
PASS — Production Closure Ready
```
