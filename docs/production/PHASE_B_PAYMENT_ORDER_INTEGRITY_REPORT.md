# SUPERFASE B — Payment and Order Integrity

## Objetivo
Cerrar el flujo financiero del ecommerce Selfcare Sinners para que Stripe, órdenes, cupones, inventario, emails y refunds queden consistentes e idempotentes.

## Cambios incluidos

### Backend
- Webhook Stripe reescrito con idempotencia real basada en `stripe_events.processed_at`.
- Los eventos duplicados ya no reprocesan órdenes.
- Si un evento falla, no se marca como procesado para permitir retry de Stripe.
- `checkout.session.completed` ahora llama a `finalize_paid_order(...)` en Supabase.
- `checkout.session.expired` marca la orden pendiente como `cancelado`.
- `payment_intent.payment_failed` marca la orden pendiente como `payment_failed` cuando Stripe manda metadata `order_id`.
- `/api/checkout` ahora cobra exactamente `orders.total`, no la suma bruta de líneas antes del descuento.
- Stripe Checkout recibe metadata `order_id` en la sesión y en el PaymentIntent.
- `/api/orders` guarda `subtotal`, `discount_amount`, `total`, `currency` y `product_snapshot`.
- Refund admin endurecido:
  - valida estado de orden;
  - valida monto positivo;
  - valida monto máximo reembolsable;
  - guarda `refunded_amount`, `stripe_refund_id`, `refunded_at`;
  - soporta restock opcional;
  - registra `audit_logs`.
- `/api/admin/store` ahora usa la tienda principal single-store, no `owner_user_id`.

### Base de datos
- Nueva migración `scripts/db/002_payment_order_integrity.sql`.
- Agrega columnas de refund a `orders`.
- Agrega columnas de diagnóstico a `stripe_events`.
- Agrega índices para payment intent, status y eventos procesados.
- Agrega RPC `finalize_paid_order(...)`:
  - bloquea la orden con `FOR UPDATE`;
  - valida estado pendiente;
  - valida existencia de items;
  - valida stock antes de descontar;
  - descuenta inventario;
  - registra `inventory_movements`;
  - consume cupón solo después de pago confirmado;
  - actualiza orden a `pagado` con `paid_at`;
  - marca `inventory_exception` si no puede reconciliar stock.
- Agrega RPC `restock_refunded_item(...)` para refunds con restock.
- `database_schema.sql` y `001_selfcare_sinners_production_schema.sql` quedan sincronizados para instalaciones limpias.

## Riesgos cerrados
- Cobro en Stripe por total equivocado cuando había cupón.
- Doble procesamiento de webhooks.
- Cupón consumido antes de pago confirmado.
- Stock descontado antes de pago confirmado.
- Orden pagada sin movimiento de inventario.
- Refund mayor al total reembolsable.
- Admin store inaccesible por modelo single-store.

## SQL requerido en Supabase
Ejecutar una vez antes o inmediatamente después del deploy:

```sql
-- pegar y ejecutar el archivo:
-- scripts/db/002_payment_order_integrity.sql
```

## Validación esperada
- `GET /api/health` responde `status=ok` y `database=connected`.
- Login admin sigue funcionando.
- `/api/admin/store` responde `hasStore=true` con rol admin.
- Crear orden deja `status='pendiente'`.
- Crear checkout devuelve `url` y `sessionId`.
- El webhook `checkout.session.completed` cambia la orden a `pagado`.
- Se genera movimiento `inventory_movements.reason='sale'`.
- El cupón solo incrementa `current_uses` después del webhook confirmado.
- Repetir el mismo evento Stripe no descuenta stock dos veces.
- Refund parcial deja `status='partially_refunded'`.
- Refund total deja `status='refunded'`.

## Logs a enviar si falla
- Railway deploy logs.
- Railway runtime logs alrededor de `/api/checkout` o `/api/webhooks/stripe`.
- Respuesta JSON del endpoint que falló.
- En Supabase, resultado de:

```sql
SELECT id, status, total, subtotal, discount_amount, stripe_session_id, stripe_payment_intent_id, refunded_amount, stripe_refund_id, paid_at, notes
FROM orders
ORDER BY created_at DESC
LIMIT 5;

SELECT * FROM stripe_events ORDER BY created_at DESC LIMIT 5;
SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 10;
```
