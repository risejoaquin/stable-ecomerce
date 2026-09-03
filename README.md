# EMAIL PRODUCTION B — Queue, Webhooks & Deliverability

Entrega regenerada completa. Incluye cola formal de correos, locking, dedupe, retries, suppression list y webhook Resend.

## Validación rápida

```powershell
Unblock-File .\scripts\qa\smoke-email-production-b.ps1
.\scripts\qa\smoke-email-production-b.ps1
npm install
npm run build
```

## Migración

```sql
scripts/db/042_email_production_b_queue_webhooks_deliverability.sql
NOTIFY pgrst, 'reload schema';
```

---

# EMAIL PRODUCTION A — Safety + Service Consolidation

Entrega generada después de EMERGENCY-DRY-05. Consolida el servicio central de emails, políticas por propósito, request_id/dedupe_key, layout premium base y endpoint admin de health para email.

Validación rápida:

```powershell
Unblock-File .\scripts\qa\smoke-email-production-a.ps1
.\scripts\qa\smoke-email-production-a.ps1
npm install
npm run build
```

Migración Supabase:

```sql
scripts/db/041_email_production_a_safety_service_contract.sql
NOTIFY pgrst, 'reload schema';
```

---



---

# EMERGENCY-DRY-05 — Account Menu & Types Consolidation

Estado objetivo: consolidar menú de cuenta desktop/mobile y tipos compartidos para eliminar duplicación, drift funcional y colisiones de definición.

Incluye:

- `src/components/account/account-links.ts`
- `src/components/account/AccountMenu.tsx`
- `src/components/account/AccountMobileSheet.tsx`
- `src/lib/auth-modal.ts`
- `src/types.ts` como re-export de compatibilidad
- `src/types/index.ts` como fuente canónica de tipos
- `scripts/qa/smoke-emergency-dry-05.ps1`
- `docs/emergency/EMERGENCY_DRY_05_ACCOUNT_MENU_TYPES_CONSOLIDATION.md`

Validación:

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-05.ps1
.\scripts\qa\smoke-emergency-dry-05.ps1
npm run build
```

Resultado esperado: un solo menú de cuenta, un solo bottom sheet mobile, un solo mapa de links, logout centralizado y tipos sin duplicación.

# EMERGENCY-DRY-04.1 — CSS Build Fix

Corrige fallo de build en Railway/PostCSS causado por secuencias literales `\n` dentro de `src/styles/uix-soft-premium-system.css`.

Validación rápida:

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-04.ps1
.\scripts\qa\smoke-emergency-dry-04.ps1
npm run build
```

---

# EMERGENCY-DRY-04 — CSS/System Collision Cleanup

Estado: generado para validación.

Corrige colisiones visuales centralizando los imports CSS globales en:

```txt
src/styles/uix-soft-premium-system.css
```

Validación rápida:

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-04.ps1
.\scripts\qa\smoke-emergency-dry-04.ps1
npm install
npm run build
```

---

# EMERGENCY-DRY-03 — Abandoned Cart Race Condition Fix

Corrige la condición de carrera del job de recuperación de carritos abandonados.

## Validación rápida

1. Aplicar migración en Supabase:

```sql
scripts/db/040_emergency_dry_03_abandoned_cart_recovery_locking.sql
NOTIFY pgrst, 'reload schema';
```

2. Ejecutar smoke local:

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-03.ps1
.\scripts\qa\smoke-emergency-dry-03.ps1
npm run build
```

3. Deploy:

```powershell
git add .
git commit -m "Emergency DRY 03 fix abandoned cart race condition"
git push origin main
```

---

# Selfcare Sinners Ecommerce

Ecommerce premium de skincare con storefront, cuenta de cliente, admin panel, pagos Stripe, Supabase PostgreSQL, emails Resend y deploy Railway.

## Estado actual

Proyecto avanzado en etapa de cierre técnico/comercial. El roadmap post-launch principal ya fue ejecutado hasta PL35 y el trabajo actual se concentra en cerrar macrofases de emergencia DRY, confiabilidad de emails, UIX final, performance y release final.

### Último bloque aplicado

```txt
EMERGENCY-DRY-02 — Analytics dedupe centralization
```

Corrige duplicación de analytics y riesgo de doble ejecución de eventos.

### Bloque anterior validado

```txt
EMERGENCY-DRY-01 — Route collision + centralized logout
Estado: PASS local + npm run build PASS
```

## Stack

- Frontend: Vite / React
- Backend: Node / Express
- DB: Supabase PostgreSQL
- Payments: Stripe
- Email: Resend
- Deploy: Railway
- Runtime/build: Node/Bun en Railway

## Comandos principales

```powershell
npm install
npm run build
npm run dev
```

## Deploy

```powershell
git status
git add .
git commit -m "Emergency DRY 02 centralize analytics dedupe events"
git push origin main
```

## Smokes actuales

### EMERGENCY-DRY-01

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-01.ps1
.\scripts\qa\smoke-emergency-dry-01.ps1
```

### EMERGENCY-DRY-02

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-02.ps1
.\scripts\qa\smoke-emergency-dry-02.ps1
npm run build
```

## Roadmap restante por macrofases

Las fases sueltas quedaron convertidas a macrofases. Ver:

```txt
docs/roadmap/ROADMAP_MACROFASES_MASTER_RESTANTES.md
```

### MACROFASE 1 — EMERGENCY DRY A: Route, Logout, Analytics

1. Eliminar ruta duplicada `POST /api/admin/catalog/validate-import`.
2. Centralizar logout en `src/lib/auth-session.ts`.
3. Centralizar analytics en `src/lib/analytics.ts`.
4. Agregar `event_id` / `dedupe_key`.
5. Eliminar tracking duplicado en App/Home/Product/ProductCard.

Estado:

- DRY-01: PASS local + build PASS.
- DRY-02: entrega actual.

### MACROFASE 2 — EMERGENCY DRY B: Jobs, Email Queue Base, Race Conditions

1. Corregir race condition de carrito abandonado.
2. Reemplazar `setInterval` frágil por job controlado o claim atómico.
3. Crear dedupe por carrito/email/evento.
4. No marcar recordatorios enviados si Resend falla.
5. Preparar `email_queue`/retries.

### MACROFASE 3 — EMERGENCY DRY C: CSS/System Cleanup

1. Detectar colisiones CSS.
2. Consolidar tokens UIX.
3. Separar CSS legacy de CSS activo.
4. Normalizar nombres de clases.
5. Validar carrito/header/admin/home.

### MACROFASE 4 — EMERGENCY DRY D: Account Menu + Types

1. Consolidar menú de cuenta desktop.
2. Consolidar bottom sheet mobile.
3. Reutilizar menú en AuthMock/header/mobile nav.
4. Consolidar tipos duplicados.
5. Crear fuente única de navegación de cuenta/admin.

### MACROFASE 5 — EMAIL PRODUCTION A: Safety + Service

1. Cerrar protección admin/email routes.
2. Sanitizar HTML dinámico.
3. Rate limits en forgot/reset/resend.
4. EmailService central estable.
5. APP_URL canónico.

### MACROFASE 6 — EMAIL PRODUCTION B: Queue, Webhooks, Deliverability

1. `email_queue`.
2. `email_delivery_attempts`.
3. retry/backoff/locking/dedupe.
4. Resend webhooks.
5. suppression list.

### MACROFASE 7 — EMAIL PRODUCTION C: Admin Email Center + Templates

1. Admin Email Center.
2. Filtros por estado/tipo/email/pedido.
3. Preview de templates.
4. Reenviar/test-send controlado.
5. Templates Soft Premium Skincare.

### MACROFASE 8 — UIX SYSTEM A: Storefront + Home Architecture

1. Home comercial completa.
2. Catálogo por intención de compra.
3. Product detail con beneficios/ingredientes/CTA claro.
4. Carrito/checkout consistente.
5. Mobile-first polish.

### MACROFASE 9 — UIX SYSTEM B: Admin Command Center

1. Alertas críticas arriba.
2. Ventas/órdenes/stock/webhooks por prioridad.
3. Clientes/cupones/catálogo separados.
4. Acciones pendientes y auditoría visibles.
5. Patrón único para tablas/formularios/cards admin.

### MACROFASE 10 — PERFORMANCE/RELEASE FINAL

1. Route splitting storefront/admin.
2. Dynamic imports en dashboards pesados.
3. manualChunks Vite/Rollup.
4. Auditoría npm controlada.
5. Regression final + reporte 100% + backlog v2.

## Reglas de trabajo

No avanzar de macrofase si no hay:

- Smoke PASS.
- `npm run build` PASS.
- Commit/push correcto.
- Railway deploy OK.
- Logs sin error crítico.

## Variables de entorno esperadas

```txt
ADMIN_EMAIL
EMAIL_FROM
JWT_SECRET
NODE_ENV
PORT
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_ANON_KEY
SUPABASE_DB_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
VITE_API_URL
VITE_APP_URL
PRIMARY_STORE_SLUG=selfcare-sinners
ALLOWED_ORIGINS=https://selfcaresinners.com,https://www.selfcaresinners.com
```

## Notas de seguridad

- No ejecutar `npm audit fix` a ciegas; revisar primero con `npm audit`.
- No tocar Stripe/webhooks/Supabase sin smoke específico.
- Los hotfixes DRY deben compilar antes de continuar UIX o Email Production.

---

# EMAIL PRODUCTION C — Admin Email Center + Premium Templates

Estado objetivo: cerrar administración operativa del sistema de correos.

Incluye:

- `src/pages/admin/AdminEmailCenterPage.tsx`
- `src/hooks/useAdminEmail.ts`
- `src/server/email/email-admin-center.ts`
- `scripts/db/043_email_production_c_admin_center_templates.sql`
- `scripts/qa/smoke-email-production-c.ps1`
- `docs/email/EMAIL_PRODUCTION_C_ADMIN_EMAIL_CENTER_PREMIUM_TEMPLATES.md`

Validación rápida:

```powershell
Unblock-File .\scripts\qa\smoke-email-production-c.ps1
.\scripts\qa\smoke-email-production-c.ps1
npm install
npm run build
```

Migración:

```sql
scripts/db/043_email_production_c_admin_center_templates.sql
NOTIFY pgrst, 'reload schema';
```

Deploy:

```powershell
git add .
git commit -m "Email Production C admin email center premium templates"
git push origin main
```
