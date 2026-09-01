# POST-LAUNCH 27 — Customer Success, Retention Operations & Post-Purchase Experience

## Objetivo

Mejorar experiencia post-compra, monitorear satisfacción del cliente, gestionar soporte y seguimiento, medir recompra, activar retención real, optimizar emails post-compra, gestionar quejas/devoluciones, medir NPS/CSAT y convertir compradores en clientes recurrentes.

## Alcance

- Customer success snapshot operativo.
- Validación de experiencia post-compra.
- Medición de satisfacción/NPS/CSAT.
- Seguimiento de soporte post-compra.
- Medición de recompra.
- Activación de retención real.
- Optimización de emails post-compra.
- Gestión de quejas/devoluciones.
- Conversión de compradores en clientes recurrentes.

## Tablas

- customer_success_snapshots
- post_purchase_experience_checks
- customer_satisfaction_measurements
- support_followup_tasks
- repeat_purchase_measurements
- retention_activation_runs
- post_purchase_email_optimizations
- complaints_returns_cases
- nps_csat_surveys
- recurring_customer_conversion_reports

## Smoke

Ejecutar:

```powershell
Unblock-File .\scripts\qa\smoke-customer-success.ps1

.\scripts\qa\smoke-customer-success.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Resultado esperado:

```txt
PASS customer success smoke checks
```
