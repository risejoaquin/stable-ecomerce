# EMAIL PRODUCTION A — Safety + Service Consolidation

## Objetivo

Cerrar la base productiva del sistema de correos antes de avanzar a cola, webhooks y Email Center.

## Cambios

- `EmailService` queda como punto central de envío.
- Se agrega `email-policy.ts` para clasificar propósitos de correo.
- Se agrega `email-template-system.ts` con layout premium reutilizable.
- Se fortalece `email-events.ts` con `dedupe_key` y `request_id`.
- Se agrega migración `041_email_production_a_safety_service_contract.sql`.
- Los mocks de email fallan cerrados en producción si no existe `RESEND_API_KEY`, salvo `EMAIL_ALLOW_MOCKS=true`.
- Se agrega endpoint admin `GET /api/admin/email/service-health`.
- `GET /api/admin/email/events` ahora requiere `requireAdmin()`.
- Review request usa purpose explícito `review_request` y dedupe key.

## Riesgos mitigados

- Fallos silenciosos de provider.
- Emails sin trazabilidad.
- Propósitos de correo mezclados como `generic`.
- Falta de request id/dedupe key para auditoría.
- Configuración insegura de email en producción.
- Exposición innecesaria de eventos de email a usuarios autenticados no admin.

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-email-production-a.ps1
.\scripts\qa\smoke-email-production-a.ps1
npm run build
```

## Migración

```sql
scripts/db/041_email_production_a_safety_service_contract.sql
NOTIFY pgrst, 'reload schema';
```
