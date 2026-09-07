# POST-LAUNCH 12 — Customer Account, Loyalty, Subscriptions & Personalization

## Objetivo
Construir la base operativa de experiencia de cliente: perfil avanzado, preferencias, historial, loyalty points, wallet, recompra, recomendaciones, suscripciones base y notificaciones personalizadas.

## Alcance
- Customer profiles.
- Customer preferences.
- Loyalty accounts and transactions.
- Wallet/coupons foundation.
- Rebuy lists.
- Recommendations.
- Subscriptions/rebuy reminders.
- Personalization events.
- Customer notification events.
- Admin customer-experience dashboard endpoints.

## Smoke test
`scripts/qa/smoke-customer-loyalty.ps1`

## Criterio de cierre
- Migración 018 aplicada.
- Tablas customer_* presentes.
- Endpoints públicos customer responden 200.
- Endpoints admin customer-experience responden 200.
- Creación de segmento, ajuste loyalty y notificación cliente responden 200.
