# POST-LAUNCH 04 — Content, Email, Reviews & Retention

## Objetivo

Fortalecer confianza y retención antes de tráfico pagado:

- emails transaccionales finales;
- plantillas Resend premium;
- reviews públicas moderadas;
- flujo post-compra;
- cupones de recompra;
- newsletter y captura de leads;
- lifecycle campaigns;
- abandoned cart recovery;
- contenido legal/políticas finales;
- páginas públicas de contacto/soporte.

## Nuevos contratos

### Público

- `GET /api/public/support`
- `GET /api/public/content/pages`
- `POST /api/newsletter/subscribe`
- `POST /api/support/messages`
- `POST /api/retention/abandoned-cart`

### Admin

- `GET /api/admin/retention/summary`
- `GET /api/admin/newsletter/subscribers`
- `GET /api/admin/lifecycle/events`
- `GET /api/admin/email/events`
- `GET /api/admin/support/messages`
- `POST /api/admin/orders/:id/review-request`
- `POST /api/admin/coupons/rebuy`

## Migración

Ejecutar:

```sql
scripts/db/010_post_launch_04_content_email_reviews_retention.sql
```

Valida:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'newsletter_subscribers',
    'support_messages',
    'lifecycle_events',
    'review_requests',
    'public_content_pages',
    'abandoned_cart_recovery_events'
  )
ORDER BY table_name;
```

## Smoke test

```powershell
Unblock-File .\scripts\qa\smoke-retention.ps1

.\scripts\qa\smoke-retention.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Criterio PASS

- Tablas nuevas existen.
- `/api/public/support` responde 200.
- `/api/public/content/pages` responde 200.
- Newsletter subscribe crea/actualiza subscriber.
- Support message se registra.
- Abandoned cart capture registra lifecycle event.
- Admin retention summary responde 200.
- Admin newsletter/lifecycle/email/support endpoints responden 200.
