# POST-LAUNCH 19 — Performance, Load Testing & Cost Optimization

## Objetivo

Cerrar una capa operativa para pruebas de carga, optimización Supabase/Railway, query profiling, caché, control de costos, alertas de recursos y preparación para más tráfico real.

## Alcance

- `performance_test_runs`
- `endpoint_performance_snapshots`
- `query_profile_events`
- `slow_query_reports`
- `cache_metrics`
- `cost_snapshots`
- `resource_usage_alerts`
- `admin_endpoint_optimization_checks`
- `railway_optimization_checks`
- `supabase_optimization_checks`
- `load_test_scenarios`

## Endpoints

- `GET /api/admin/performance/summary`
- `GET /api/admin/performance/load-tests`
- `POST /api/admin/performance/load-tests/run`
- `GET /api/admin/performance/endpoints`
- `GET /api/admin/performance/query-profiles`
- `POST /api/admin/performance/query-profiles/run`
- `GET /api/admin/performance/slow-queries`
- `GET /api/admin/performance/cache`
- `POST /api/admin/performance/cache/analyze`
- `GET /api/admin/performance/costs`
- `POST /api/admin/performance/costs/snapshot`
- `GET /api/admin/performance/resource-alerts`
- `POST /api/admin/performance/resource-alerts/run`
- `GET /api/admin/performance/optimization-checks`
- `POST /api/admin/performance/optimization-checks/run`

## Decisión técnica

PL19 no ejecuta pruebas destructivas ni stress real desde producción. Deja una capa segura de registro, baseline, simulación controlada y readiness para carga real. Las pruebas de carga agresivas deben ejecutarse fuera de producción o con ventanas controladas.

## Validación

Ejecutar:

```powershell
.\scripts\qa\smoke-performance-cost.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Resultado esperado:

```txt
PASS performance cost smoke checks
```
