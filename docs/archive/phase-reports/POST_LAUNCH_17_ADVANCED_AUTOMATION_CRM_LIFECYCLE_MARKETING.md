# POST-LAUNCH 17 — Advanced Automation, CRM & Lifecycle Marketing

## Estado

Preparado para validación en producción.

## Objetivo

Construir la capa base de CRM avanzado y lifecycle marketing para Selfcare Sinners:

- automatizaciones por comportamiento
- CRM avanzado
- customer journeys
- campañas por segmento
- recuperación de carrito avanzada
- post-compra automatizado
- recompra automatizada
- recordatorios inteligentes
- email / push orchestration base
- lifecycle marketing

## Migración

Ejecutar en Supabase:

```sql
scripts/db/023_post_launch_17_advanced_automation_crm_lifecycle_marketing.sql
NOTIFY pgrst, 'reload schema';
```

## Tablas agregadas

- `crm_contacts`
- `crm_segments`
- `lifecycle_journeys`
- `journey_steps`
- `automation_triggers`
- `automation_executions`
- `customer_touchpoints`
- `campaign_orchestration_events`

## Endpoints agregados

- `GET /api/admin/crm/summary`
- `GET /api/admin/crm/contacts`
- `POST /api/admin/crm/contacts`
- `GET /api/admin/crm/segments`
- `POST /api/admin/crm/segments`
- `GET /api/admin/crm/journeys`
- `POST /api/admin/crm/journeys`
- `GET /api/admin/crm/automation`
- `POST /api/admin/crm/automation/run`
- `GET /api/admin/crm/touchpoints`
- `GET /api/admin/crm/campaigns`
- `POST /api/admin/crm/campaigns/orchestrate`
- `GET /api/admin/crm/lifecycle-insights`

## Contratos de escritura

La migración incluye `UNIQUE` para los UPSERT usados por backend:

- `crm_contacts(store_id, email)`
- `crm_segments(store_id, segment_key)`
- `lifecycle_journeys(store_id, journey_key)`
- `journey_steps(journey_id, step_key)`
- `automation_triggers(store_id, trigger_key)`
- `campaign_orchestration_events(store_id, campaign_key)`

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-crm-lifecycle.ps1

.\scripts\qa\smoke-crm-lifecycle.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Resultado esperado:

```txt
PASS CRM summary -> 200
PASS CRM contacts -> 200
PASS Create CRM contact -> 200
PASS CRM segments -> 200
PASS Create CRM segment -> 200
PASS Lifecycle journeys -> 200
PASS Create lifecycle journey -> 200
PASS CRM automation -> 200
PASS Run CRM automation -> 200
PASS CRM touchpoints -> 200
PASS CRM campaigns -> 200
PASS Orchestrate CRM campaign -> 200
PASS Lifecycle insights -> 200
PASS Admin diagnostics -> 200
PASS CRM lifecycle smoke checks
```

## Nota técnica

Esta fase no envía emails/push reales todavía. Crea la capa operacional, los contratos de datos, los journeys base y la orquestación para habilitar automatización real posteriormente con Resend, push y/o proveedores externos.
