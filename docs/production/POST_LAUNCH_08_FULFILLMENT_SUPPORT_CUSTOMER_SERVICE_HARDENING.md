# POST-LAUNCH 08 — Fulfillment, Support Operations & Customer Service Hardening

## Objetivo

Endurecer la operación diaria posterior a venta: fulfillment, tracking, soporte, tickets, SLA, incidencias de pedido, cambios/devoluciones y reportes operativos.

## Alcance

- Flujo operativo de fulfillment real.
- Reporte de pedidos listos para enviar.
- Control de pedidos atrasados.
- Tracking avanzado y marca de envío.
- Tickets de soporte y mensajes.
- SLA de soporte.
- Plantillas de respuesta.
- Incidentes de pedido.
- Solicitudes de cambios/devoluciones.
- Historial de servicio por pedido.

## Migración

Ejecutar:

```sql
scripts/db/014_post_launch_08_fulfillment_support_customer_service.sql
```

Después:

```sql
NOTIFY pgrst, 'reload schema';
```

## Smoke

```powershell
.\scripts\qa\smoke-fulfillment-support.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Criterio PASS

- DB migration PASS.
- Fulfillment summary PASS.
- Ready-to-ship report PASS.
- Late orders report PASS.
- Support tickets PASS.
- SLA/templates PASS.
- Order service history PASS.
- Incident create PASS.
- Diagnostics PASS.
