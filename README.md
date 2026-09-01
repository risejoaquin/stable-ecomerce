# Selfcare Sinners Ecommerce

## Estado actual

Roadmap ejecutado y validado hasta:

- POST-LAUNCH 16 — Marketplace Expansion, Multi-Channel Sales & External Integrations: PASS
- POST-LAUNCH 17 — Advanced Automation, CRM & Lifecycle Marketing: preparado para validación

## Stack

- Frontend: Vite / React
- Backend: Node / Express
- DB: Supabase PostgreSQL
- Payments: Stripe
- Email: Resend
- Deploy: Railway

## PL17

Incluye CRM avanzado, automatizaciones por comportamiento, journeys, campañas por segmento, recuperación de carrito avanzada, post-compra, recompra y orquestación email/push base.

### Migración

```sql
scripts/db/023_post_launch_17_advanced_automation_crm_lifecycle_marketing.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke

```powershell
.\scripts\qa\smoke-crm-lifecycle.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```


## POST-LAUNCH 18 — Enterprise Security, Audit Trails & Compliance Hardening

Incluye auditoría avanzada, trazabilidad admin, revisión periódica de permisos, retención de datos, exportaciones auditables, controles anti-abuso, aprobaciones para acciones sensibles y hardening final de seguridad.

### Migración

```sql
scripts/db/024_post_launch_18_enterprise_security_audit_compliance_hardening.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke

```powershell
.\scripts\qa\smoke-enterprise-security.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## POST-LAUNCH 19 — Performance, Load Testing & Cost Optimization

Incluye migración y smoke para:

- pruebas de carga controladas
- query profiling
- slow query reports
- cache metrics
- cost snapshots
- resource usage alerts
- admin endpoint optimization checks
- Railway/Supabase optimization readiness

### Migración

```sql
scripts/db/025_post_launch_19_performance_load_cost_optimization.sql
NOTIFY pgrst, 'reload schema';
```

### Smoke

```powershell
Unblock-File .\scripts\qa\smoke-performance-cost.ps1

.\scripts\qa\smoke-performance-cost.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```


## POST-LAUNCH 20 — Final Commercial Scale Report & Strategic Roadmap

Incluye reporte ejecutivo final, assessment técnico/comercial, matriz de riesgos, deuda técnica, costos operativos, capacidad de escala, roadmap estratégico 2.0, decisión de escala e investor readiness.

Validación:

```powershell
.\scripts\qa\smoke-final-scale-report.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```
