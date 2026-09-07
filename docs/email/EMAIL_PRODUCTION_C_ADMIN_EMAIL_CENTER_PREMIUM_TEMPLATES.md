# EMAIL PRODUCTION C — Admin Email Center + Premium Templates

## Objetivo

Cerrar el sistema operativo de correos desde administración: visualización de cola, eventos, health, previews de templates premium y envío de pruebas.

## Alcance

- Admin Email Center en `/admin/email`.
- Catálogo de templates premium por propósito.
- Preview seguro de templates.
- Envío de correo de prueba desde admin.
- Endpoint de templates protegido con `requireAdmin()`.
- Panel UIX beige/premium consistente con storefront/admin.

## Endpoints

- `GET /api/admin/email/events`
- `GET /api/admin/email/queue`
- `POST /api/admin/email/queue/process`
- `GET /api/admin/email/service-health`
- `GET /api/admin/email/templates`
- `POST /api/admin/email/templates/preview`
- `POST /api/admin/email/send-test`

## Migración

Ejecutar:

```sql
scripts/db/043_email_production_c_admin_center_templates.sql
NOTIFY pgrst, 'reload schema';
```

## Validación

```powershell
Unblock-File .\scripts\qa\smoke-email-production-c.ps1
.\scripts\qa\smoke-email-production-c.ps1
npm run build
```

## Resultado esperado

- Build OK.
- Admin navega a Email Center.
- Email Center carga eventos, cola, health y templates.
- Preview de template renderiza HTML premium.
- Test-send crea correo en cola.
- La UI mantiene tema Soft Premium Skincare.
