# EMERGENCY-DRY-03 — Abandoned Cart Race Condition Fix

## Objetivo

Corregir el riesgo de doble envío de correos de carrito abandonado cuando el servidor corre en Railway, reinicia o escala a más de una instancia.

## Problema detectado

El flujo anterior hacía:

1. Buscar `abandoned_carts` con `reminder_sent = false`.
2. Enviar email.
3. Marcar `reminder_sent = true`.

Ese patrón no es seguro porque dos procesos pueden leer el mismo carrito antes de que cualquiera lo actualice. También puede enviar el correo y reiniciar antes de marcarlo como enviado.

## Corrección

Se agregó un claim atómico en PostgreSQL mediante:

```sql
claim_abandoned_carts_for_recovery(...)
FOR UPDATE SKIP LOCKED
```

El job ahora:

1. Reclama carritos con `recovery_lock_id` y `recovery_locked_until`.
2. Envía el correo solo para carritos reclamados por su lock token.
3. Marca `reminder_sent = true` solo si `sendEmail()` retorna éxito.
4. Libera el lock y guarda `recovery_last_error` si falla.

## Archivos modificados

- `server.ts`
- `scripts/db/040_emergency_dry_03_abandoned_cart_recovery_locking.sql`
- `scripts/qa/smoke-emergency-dry-03.ps1`
- `docs/emergency/EMERGENCY_DRY_03_ABANDONED_CART_RACE_CONDITION.md`
- `README.md`

## Variables opcionales

```env
ABANDONED_CART_RECOVERY_DISABLED=false
ABANDONED_CART_RECOVERY_BATCH_SIZE=25
ABANDONED_CART_RECOVERY_DELAY_HOURS=2
ABANDONED_CART_RECOVERY_INTERVAL_MS=3600000
```

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-emergency-dry-03.ps1
.\scripts\qa\smoke-emergency-dry-03.ps1
npm run build
```

## Migración

Aplicar en Supabase:

```sql
scripts/db/040_emergency_dry_03_abandoned_cart_recovery_locking.sql
NOTIFY pgrst, 'reload schema';
```

## Resultado esperado

- Sin doble claim del mismo carrito.
- Sin doble envío por múltiples instancias.
- Sin marcar como enviado si Resend falla.
- Con trazabilidad de intentos, errores y locks.
