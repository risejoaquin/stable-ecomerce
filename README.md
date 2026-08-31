# Selfcare Sinners Ecommerce

**Owner técnico:** SolidBit  
**Estado:** Launch Readiness cerrado + Post-launch 02–08 validados + PL09 preparado  
**Deploy:** Railway  
**DB:** Supabase PostgreSQL  
**Pagos:** Stripe Checkout + Webhooks  
**Emails:** Resend  

---

## Estado del proyecto

Selfcare Sinners es un ecommerce productivo orientado a skincare/autocuidado. El sistema ya cuenta con checkout real, webhooks Stripe, admin operativo, tracking público, SEO/PWA, diagnósticos, revenue operations, paid traffic readiness, catálogo/merchandising y fulfillment/support foundation.

### Fases cerradas

- Launch Readiness: CLOSED
- Post-launch stabilization: CLOSED
- POST-LAUNCH 02 — Commercial Operations & Growth Readiness: PASS
- POST-LAUNCH 03 — Brand, Catalog & Conversion Optimization: PASS
- POST-LAUNCH 04 — Content, Email, Reviews & Retention: PASS
- POST-LAUNCH 05 — Analytics, Ads, Automation & Revenue Operations: PASS
- POST-LAUNCH 06 — Paid Traffic Readiness & Conversion Hardening: PASS
- POST-LAUNCH 07 — Real Catalog Import, Merchandising & Sales Enablement: PASS
- POST-LAUNCH 08 — Fulfillment, Support Operations & Customer Service Hardening: PASS

### Fase actual

- POST-LAUNCH 09 — Finance, Accounting, Reconciliation & Admin Reporting

---

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- DB: Supabase PostgreSQL
- Auth: JWT + admin RBAC
- Payments: Stripe Checkout + webhooks idempotentes
- Email: Resend
- Deploy: Railway
- Observability: health/readiness, diagnostics admin, operational events, smoke tests

---

## Variables de entorno principales

Nunca commitear secretos reales. Usar Railway/Supabase dashboard.

```env
NODE_ENV=production
PORT=3000
VITE_APP_URL=https://selfcaresinners.com
VITE_API_URL=https://selfcaresinners.com
ALLOWED_ORIGINS=https://selfcaresinners.com,https://www.selfcaresinners.com
PRIMARY_STORE_SLUG=selfcare-sinners
JWT_SECRET=...
ADMIN_EMAIL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM=...
```

---

## Comandos locales

```bash
npm install
npm run build
npm start
```

---

## Migraciones

Las migraciones están en:

```txt
scripts/db/
```

Para PL09 aplicar:

```txt
scripts/db/015_post_launch_09_finance_accounting_reconciliation_reporting.sql
```

Después ejecutar:

```sql
NOTIFY pgrst, 'reload schema';
```

---

## Smoke tests

```powershell
.\scripts\qa\smoke-production.ps1 -BaseUrl "https://selfcaresinners.com"

.\scripts\qa\smoke-admin.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "ADMIN_EMAIL" `
  -Password "ADMIN_PASSWORD"

.\scripts\qa\smoke-finance.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "ADMIN_EMAIL" `
  -Password "ADMIN_PASSWORD"
```

---

## Endpoints de salud

```txt
GET /api/health
GET /api/readiness
GET /api/admin/diagnostics
GET /api/admin/diagnostics/stripe
GET /api/admin/diagnostics/supabase
GET /api/admin/diagnostics/orders
GET /api/admin/diagnostics/security
```

---

## PL09 — Finance endpoints

```txt
GET  /api/admin/finance/summary
GET  /api/admin/finance/reconciliation
GET  /api/admin/finance/sales
GET  /api/admin/finance/margins
GET  /api/admin/finance/refunds
GET  /api/admin/finance/inventory-valuation
GET  /api/admin/finance/daily-close
POST /api/admin/finance/daily-close
GET  /api/admin/finance/export/orders.csv
```

---

## Seguridad

- No subir `.env`, secretos, tokens, exports privados, backups ni credenciales.
- Rotar credenciales si se exponen en logs/chat.
- Mantener `ADMIN_EMAIL`, `JWT_SECRET`, Stripe y Supabase solo en Railway.
- Probar smoke admin después de cada rotación.

---

## Operación diaria recomendada

1. Revisar `/api/admin/diagnostics`.
2. Revisar eventos Stripe sin resolver.
3. Revisar pedidos pendientes/listos para enviar.
4. Revisar inventario negativo/bajo.
5. Ejecutar cierre diario financiero.
6. Exportar CSV de órdenes para respaldo operativo.

---

## Documentación

Ver carpeta:

```txt
docs/production/
```

## POST-LAUNCH 11 — Scale, Multi-Operator Workflows & Advanced Admin UX

Estado esperado: pendiente de validación.

Incluye workflows multi-operador, roles/permisos granulares, colas de trabajo, asignaciones, notificaciones internas, acciones masivas y auditoría avanzada.

Migración:

```sql
scripts/db/017_post_launch_11_scale_multi_operator_advanced_admin_ux.sql
```

Smoke:

```powershell
.\scripts\qa\smoke-scale-admin.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```
