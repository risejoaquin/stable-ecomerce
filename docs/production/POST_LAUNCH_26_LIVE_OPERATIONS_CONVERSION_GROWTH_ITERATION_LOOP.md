# POST-LAUNCH 26 — Live Operations Monitoring, Conversion Optimization & Growth Iteration Loop

## Objetivo

Monitorear operación real post-campaña, medir ventas reales, analizar comportamiento por canal, optimizar conversión con datos reales, priorizar experimentos A/B, detectar cuellos de botella comerciales, iterar campañas por performance, mantener control de riesgo/costos y convertir la tienda en un sistema de mejora continua.

## Alcance cerrado

- Live operations snapshots.
- Real sales measurements.
- Channel behavior analytics.
- Conversion optimization experiments.
- A/B prioritization.
- Commercial bottleneck reports.
- Campaign iteration records.
- Risk and cost control snapshots.
- Growth loop actions.
- Continuous improvement reports.

## Validación

1. Ejecutar `scripts/db/032_post_launch_26_live_operations_conversion_growth_iteration_loop.sql` en Supabase.
2. Ejecutar `NOTIFY pgrst, 'reload schema';`.
3. Desplegar en Railway.
4. Ejecutar `scripts/qa/smoke-live-growth-loop.ps1`.

## Resultado esperado

`PASS live growth loop smoke checks`.
