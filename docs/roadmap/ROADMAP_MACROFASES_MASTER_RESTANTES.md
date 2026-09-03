# Roadmap maestro restante — Macrofases agrupadas

Este roadmap reemplaza fases sueltas por macrofases de trabajo de 5 puntos. La regla operativa es: una macrofase se genera, se prueba localmente, se despliega en Railway, se valida con smoke/logs y solo después se continúa con la siguiente.

## Estado base

- Producto avanzado: storefront, admin, checkout, pagos, órdenes, Supabase, Stripe, Resend y Railway ya existen.
- Roadmap post-launch PL02–PL35 cerrado como base histórica.
- UIX04 aplicado: tema Soft Premium Skincare en storefront/admin.
- EMERGENCY-DRY-01 validado localmente y con build PASS por el usuario.

## MACROFASE 1 — EMERGENCY DRY A: Route, Logout, Analytics

Estado: en curso.

Incluye:

1. Eliminar ruta duplicada `POST /api/admin/catalog/validate-import`.
2. Centralizar logout en `src/lib/auth-session.ts`.
3. Centralizar analytics en `src/lib/analytics.ts`.
4. Agregar dedupe/event_id para eventos de marketing.
5. Eliminar tracking duplicado en App/Home/Product/ProductCard.

Entregas:

- `EMERGENCY-DRY-01-route-logout-deduplication-v1-FULL.zip` — PASS local + build PASS.
- `EMERGENCY-DRY-02-analytics-dedupe-centralization-v1-FULL.zip` — entrega actual.

## MACROFASE 2 — EMERGENCY DRY B: Jobs, Email Queue Base, Race Conditions

Incluye:

1. Corregir race condition del carrito abandonado.
2. Reemplazar `setInterval` frágil por job controlado o claim atómico.
3. Crear dedupe por carrito/email/evento.
4. Evitar marcar recordatorios como enviados si Resend falla.
5. Preparar `email_queue`/retries como contrato operativo.

Entrega objetivo:

- `EMERGENCY-DRY-03-abandoned-cart-race-condition-fix-v1-FULL.zip`.

## MACROFASE 3 — EMERGENCY DRY C: CSS/System Cleanup

Incluye:

1. Detectar colisiones CSS entre sistemas visuales anteriores.
2. Consolidar tokens en `uix-soft-premium-system.css`.
3. Separar CSS legacy de CSS activo.
4. Normalizar nombres de clases UIX.
5. Validar carrito/header/admin/home sin estilos pisados.

Entrega objetivo:

- `EMERGENCY-DRY-04-css-collision-cleanup-v1-FULL.zip`.

## MACROFASE 4 — EMERGENCY DRY D: Account Menu + Types

Incluye:

1. Consolidar menú de cuenta desktop en un componente único.
2. Consolidar account bottom sheet mobile en un componente único.
3. Hacer que `AuthMock.UserButton`, header y mobile nav reutilicen los mismos componentes.
4. Consolidar tipos duplicados `Product`/`StoreConfig`.
5. Crear fuente única de navegación de cuenta/admin.

Entrega objetivo:

- `EMERGENCY-DRY-05-account-menu-types-consolidation-v1-FULL.zip`.

## MACROFASE 5 — EMAIL PRODUCTION A: Safety + Service

Incluye:

1. Cerrar protección admin/email routes.
2. Sanitizar HTML dinámico en todos los emails.
3. Rate limits en forgot/reset/resend.
4. `EmailService` central estable.
5. APP_URL canónico en links sensibles.

Estado: iniciado por `MACRO-EMAIL-UIX-A`, pendiente cerrar después del frente DRY.

## MACROFASE 6 — EMAIL PRODUCTION B: Queue, Webhooks, Deliverability

Incluye:

1. `email_queue`.
2. `email_delivery_attempts`.
3. retry/backoff/locking/dedupe.
4. Resend webhooks delivered/bounced/complained/opened/clicked.
5. suppression list.

## MACROFASE 7 — EMAIL PRODUCTION C: Admin Email Center + Templates

Incluye:

1. Admin Email Center.
2. filtros por estado/tipo/email/pedido.
3. preview de templates.
4. reenviar/test-send controlado.
5. rediseño Soft Premium Skincare para emails.

## MACROFASE 8 — UIX SYSTEM A: Storefront + Home Architecture

Incluye:

1. Home con arquitectura comercial completa.
2. Catálogo ordenado por intención de compra.
3. Product detail con beneficios/ingredientes/CTA claro.
4. Carrito/checkout visualmente consistente.
5. Mobile-first polish.

## MACROFASE 9 — UIX SYSTEM B: Admin Command Center

Incluye:

1. Alertas críticas arriba.
2. ventas/órdenes/stock/webhooks organizados por prioridad.
3. clientes/cupones/catálogo como módulos separados.
4. acciones pendientes y sistema/auditoría visibles.
5. tablas/formularios/cards admin con patrón único.

## MACROFASE 10 — PERFORMANCE/RELEASE FINAL

Incluye:

1. route splitting storefront/admin.
2. dynamic imports en dashboards pesados.
3. manualChunks Vite/Rollup.
4. auditoría npm controlada.
5. regression final + reporte 100% + backlog v2.

## Regla de avance

No avanzar al siguiente bloque si el actual no cumple:

- smoke PASS.
- `npm run build` PASS.
- commit/push correcto.
- Railway deploy OK.
- logs sin error crítico.

