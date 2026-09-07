# POST-LAUNCH 29 — Operational Automation, Scheduled Reports & Alerting Workflows

## Estado objetivo

Convertir la operación de Selfcare Sinners en un sistema proactivo: reportes recurrentes, revisiones diarias/semanales, alertas comerciales/técnicas, detección de anomalías, seguimiento automatizado de campañas, soporte, retención y workflow ejecutivo.

## Alcance

- Automatizar reportes recurrentes.
- Programar revisiones diarias/semanales.
- Crear alertas comerciales y técnicas.
- Detectar anomalías operativas.
- Notificar riesgos de revenue/conversión.
- Automatizar seguimiento de campañas.
- Automatizar seguimiento de soporte/retención.
- Crear flujo de trabajo ejecutivo recurrente.
- Reducir operación manual.
- Convertir el sistema en una operación proactiva.

## Tablas

- `scheduled_report_definitions`
- `scheduled_report_runs`
- `recurring_review_schedules`
- `commercial_technical_alert_rules`
- `operational_anomaly_events`
- `revenue_conversion_risk_notifications`
- `campaign_followup_automations`
- `support_retention_followup_automations`
- `executive_workflow_automations`
- `proactive_operations_reports`

## Endpoints

- `GET /api/admin/operational-automation/summary`
- `GET /api/admin/operational-automation/report-definitions`
- `POST /api/admin/operational-automation/report-definitions/run`
- `GET /api/admin/operational-automation/report-runs`
- `POST /api/admin/operational-automation/report-runs/run`
- `GET /api/admin/operational-automation/review-schedules`
- `POST /api/admin/operational-automation/review-schedules/run`
- `GET /api/admin/operational-automation/alert-rules`
- `POST /api/admin/operational-automation/alert-rules/run`
- `GET /api/admin/operational-automation/anomalies`
- `POST /api/admin/operational-automation/anomalies/run`
- `GET /api/admin/operational-automation/risk-notifications`
- `POST /api/admin/operational-automation/risk-notifications/run`
- `GET /api/admin/operational-automation/campaign-followups`
- `POST /api/admin/operational-automation/campaign-followups/run`
- `GET /api/admin/operational-automation/support-retention-followups`
- `POST /api/admin/operational-automation/support-retention-followups/run`
- `GET /api/admin/operational-automation/executive-workflows`
- `POST /api/admin/operational-automation/executive-workflows/run`
- `GET /api/admin/operational-automation/proactive-reports`
- `POST /api/admin/operational-automation/proactive-reports/run`

## Smoke esperado

`PASS operational automation smoke checks`

## Roadmap pendiente recomendado después de PL29

- PL30 — Experimentation Platform, A/B Testing Engine & Conversion Learning System.
- PL31 — Real Integrations Layer: Email Provider, Ads APIs, Analytics Destinations & Webhooks.
- PL32 — Financial Forecasting, Inventory Demand Planning & Unit Economics.
- PL33 — Internationalization, Multi-Currency, Tax/Legal Readiness.
- PL34 — Advanced Personalization, Recommendation Engine & Customer Data Platform.
- PL35 — Scale Governance Freeze, Maintenance Mode & Product v2 Roadmap.
