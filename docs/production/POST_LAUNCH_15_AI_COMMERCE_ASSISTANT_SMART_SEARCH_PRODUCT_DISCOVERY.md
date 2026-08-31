# POST-LAUNCH 15 — AI Commerce Assistant, Smart Search & Product Discovery

## Objetivo

Agregar una capa inicial de búsqueda inteligente, asistente comercial, FAQ asistido, descubrimiento guiado de productos, sinónimos de skincare, scoring de intención de compra e insights administrativos de búsqueda.

## Alcance

- Búsqueda inteligente pública.
- Asistente de compra base sin dependencia obligatoria de proveedor externo de IA.
- FAQ asistido con respuestas controladas por base interna.
- Sinónimos y términos de skincare.
- Scoring básico de intención de compra.
- Eventos de descubrimiento y recomendación.
- Insights admin para búsqueda, sesiones, FAQ y recomendaciones.

## Seguridad

- Endpoints públicos no exponen datos privados ni administrativos.
- Endpoints admin requieren token de administrador existente.
- El asistente responde con reglas controladas y no debe prometer diagnóstico médico.
- Esta fase prepara IA comercial futura sin enviar datos a proveedores externos por defecto.

## Migración

Ejecutar:

```sql
scripts/db/021_post_launch_15_ai_commerce_assistant_smart_search_product_discovery.sql
NOTIFY pgrst, 'reload schema';
```

## Smoke

```powershell
Unblock-File .\scripts\qa\smoke-ai-commerce.ps1

.\scripts\qa\smoke-ai-commerce.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Resultado esperado

Todos los endpoints públicos y admin de `/api/ai`, `/api/search/smart` y `/api/admin/ai-commerce` deben responder 200.
