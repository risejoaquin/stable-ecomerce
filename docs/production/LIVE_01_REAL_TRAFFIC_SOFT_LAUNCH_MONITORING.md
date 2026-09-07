# LIVE-01 — Real Traffic Soft Launch, Live Monitoring & Launch Feedback Control

## Objetivo

Entrar a operación real controlada después del rediseño UI A/B/C, midiendo tráfico, conversión, checkout, revenue, soporte, campañas, incidentes y acciones de mejora sin escalar inversión a ciegas.

## Alcance

- Monitoreo de tráfico real inicial.
- Registro de sesiones y eventos de conversión.
- Observación de checkout real.
- Validación de revenue atribuido.
- Señales de soporte de usuarios reales.
- Salud de campañas durante soft launch.
- Watch de incidentes.
- Acciones de iteración priorizadas.
- Reporte diario de lanzamiento.

## Decisión técnica

Esta fase no agrega otro bloque de producto pesado. Agrega una capa de control para operar el lanzamiento real con feedback corto y decisiones basadas en datos.

## Criterio de cierre

- Migración aplicada.
- Todas las tablas visibles en Supabase.
- Smoke `smoke-live-soft-launch.ps1` en PASS.
- Railway sin errores nuevos durante el deploy.
- Revisión visual de storefront/rediseño completada.
