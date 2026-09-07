# EMAIL PRODUCTION B — Queue, Webhooks & Deliverability

## Objetivo

Cerrar la segunda capa productiva del sistema de correos:

1. Cola formal de correos.
2. Intentos de entrega.
3. Dedupe por `dedupe_key`.
4. Locking para evitar doble procesamiento.
5. Retry/backoff controlado.
6. Suppression list por bounce/complaint.
7. Webhook de Resend preparado.
8. Endpoints admin de observabilidad.

## Migración

Ejecutar en Supabase:

```sql
scripts/db/042_email_production_b_queue_webhooks_deliverability.sql
NOTIFY pgrst, 'reload schema';
```

## Módulos agregados

- `src/server/email/email-queue.ts`
- `src/server/email/email-worker.ts`
- `src/server/email/email-webhooks.ts`
- `src/server/email/email-deliverability.ts`

## Contrato de seguridad

- La cola usa `dedupe_key` único para evitar doble envío lógico.
- `claim_email_queue_for_delivery()` usa `FOR UPDATE SKIP LOCKED`.
- `email_suppression_list` bloquea destinatarios con bounce/complaint.
- Los endpoints admin deben estar protegidos con `requireAdmin()`.

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-email-production-b.ps1
.\scripts\qa\smoke-email-production-b.ps1
npm run build
```
