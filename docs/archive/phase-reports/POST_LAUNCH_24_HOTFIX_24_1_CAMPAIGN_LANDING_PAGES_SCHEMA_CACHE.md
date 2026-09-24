# POST-LAUNCH 24 HOTFIX 24.1 — Campaign Landing Pages Schema Cache

## Problema

El endpoint `POST /api/admin/content-seo/landing-pages/run` puede fallar si `campaign_landing_pages` ya existía desde una fase previa sin la columna `campaign_type`.

## Causa

`CREATE TABLE IF NOT EXISTS` no modifica tablas existentes; por eso la tabla apareció en la validación SQL, pero faltaban columnas nuevas requeridas por PL24.

## Solución

Ejecutar:

```txt
scripts/db/030b_post_launch_24_campaign_landing_pages_schema_cache_hotfix.sql
```

Incluye `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, índices y `NOTIFY pgrst, 'reload schema'`.

## Validación

Repetir `scripts/qa/smoke-content-seo.ps1`.
