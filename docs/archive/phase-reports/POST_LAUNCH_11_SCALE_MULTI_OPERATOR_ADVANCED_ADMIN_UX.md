# POST-LAUNCH 11 — Scale, Multi-Operator Workflows & Advanced Admin UX

## Objetivo
Preparar Selfcare Sinners para operar con más productos, más pedidos, más tickets y más operadores administrativos sin depender de un solo usuario.

## Alcance
- Workflows multi-operador.
- Permisos granulares por rol.
- Colas de trabajo admin.
- Asignación de pedidos, tickets y tareas.
- Vistas operativas por equipo.
- Acciones masivas trazables.
- Auditoría avanzada.
- Notificaciones internas.
- Mejora de performance operativa admin.

## Endpoints principales
- `GET /api/admin/scale/summary`
- `GET /api/admin/scale/work-queues`
- `POST /api/admin/scale/work-queues`
- `GET /api/admin/scale/assignments`
- `POST /api/admin/scale/assignments`
- `GET /api/admin/scale/roles`
- `GET /api/admin/scale/permissions`
- `GET /api/admin/scale/dashboard`
- `GET /api/admin/scale/notifications`
- `POST /api/admin/scale/notifications`
- `GET /api/admin/scale/audit`
- `GET /api/admin/scale/bulk-actions`
- `POST /api/admin/scale/bulk-actions/run`

## Migración
Ejecutar `scripts/db/017_post_launch_11_scale_multi_operator_advanced_admin_ux.sql`.

## Smoke test
Ejecutar:

```powershell
.\scripts\qa\smoke-scale-admin.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Criterio de cierre
La fase se considera PASS cuando:
- Las tablas PL11 existen.
- Los endpoints `/api/admin/scale/*` responden 200.
- Se puede crear una cola de trabajo.
- Se puede crear una asignación.
- Se puede crear una notificación interna.
- Se puede ejecutar una acción masiva.
- Diagnostics sigue en `ok`.
