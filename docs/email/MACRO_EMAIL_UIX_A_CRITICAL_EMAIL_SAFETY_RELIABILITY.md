# MACRO EMAIL/UIX A — Critical Email Safety & Reliability

## Estado

Entrega enfocada en los primeros 5 puntos críticos detectados en auditoría:

1. Protección explícita del endpoint admin de reenvío de confirmación.
2. Sanitización de HTML dinámico en templates de correo.
3. Rate limit en flujos sensibles de email.
4. Corrección de fallos silenciosos en `sendEmail()`.
5. Base de `EmailService` centralizado.

## Decisiones técnicas

- Se crea `EmailService` central para validar destinatario, enviar vía Resend/mock y registrar eventos.
- Se crea módulo de sanitización para `escapeHtml`, `safeText`, `sanitizeEmailUrl` y links canónicos con `APP_URL`.
- Los links de verificación, recuperación de contraseña y recuperación de carrito ya no dependen de `req.headers.origin`.
- El endpoint `POST /api/admin/orders/:id/resend-confirmation` queda protegido explícitamente con `requireAuth()`, `requireAdmin()` y `adminEmailLimiter`.
- `resend-verification` y `forgot-password` usan `emailSensitiveLimiter`.
- `resend-verification` evita enumeración de usuarios con respuesta genérica.

## Archivos agregados

- `src/server/email/email-service.ts`
- `src/server/email/email-sanitize.ts`
- `src/server/email/email-events.ts`
- `src/server/email/email-types.ts`
- `scripts/db/039_macro_email_uix_a_email_safety_event_contract.sql`
- `scripts/qa/smoke-email-safety.ps1`

## Archivos modificados

- `server.ts`
- `email-templates.ts`
- `README.md`

## Riesgos mitigados

- Broken access control en reenvío de confirmación.
- HTML injection en templates.
- Abuso de recuperación/verificación por falta de rate limit.
- Fallos silenciosos de Resend.
- Links críticos generados con origen no confiable.

## No toca

- Stripe
- Finalización de órdenes
- Webhook de Stripe
- Inventario
- Checkout
- Admin UIX visual
- Storefront visual

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-email-safety.ps1
.\scripts\qa\smoke-email-safety.ps1
npm install
npm run build
npm run dev
```

Con base desplegada:

```powershell
.\scripts\qa\smoke-email-safety.ps1 `
  -BaseUrl "https://selfcaresinners.com"
```

Resultado esperado:

```txt
PASS central EmailService exists
PASS email HTML sanitizer exists
PASS email event writer exists
PASS sensitive email rate limiter exists
PASS admin email rate limiter exists
PASS verification uses canonical APP_URL
PASS password reset uses canonical APP_URL
PASS abandoned cart recover URL fixed
PASS resend confirmation explicitly protected
PASS email templates sanitize dynamic text
PASS email templates sanitize URLs
PASS email event contract migration exists
PASS macro email uix a safety checks
```
