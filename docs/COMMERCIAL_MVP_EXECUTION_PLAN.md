# Stable-Ecommerce — Plan de ejecución del MVP comercial (Commerce Starter)

**Fecha base:** 14 de octubre de 2026. **Ámbito:** repositorio `risejoaquin/stable-ecomerce`, rama candidata de referencia `main@b164c8e4f3b8da8ce72b3590eae55b33c33c4d16`. **Estado de venta del paquete reproducible:** NO-GO, pendiente de certificación.

## Ruta de trabajo oficial

**Leer primero:** [Roadmap comercial auditado contra código](ROADMAP_MVP_COMERCIAL_CODE_AUDITADO_2026-10-14.md).

Este documento es la puerta de entrada para iteraciones de desarrollo y coordinación. El roadmap enlazado contiene inventario de implementación, nueve tickets `EC-01`–`EC-09`, once criterios de aceptación `EC-ACC-01`–`EC-ACC-11`, ruta crítica, calendario Gantt, matriz de riesgos, evidencia técnica y alcance comercial. Las fechas son metas sujetas a aceptación, no autorización de despliegue.

## Contrato mínimo de ejecución por cada iteración

1. Leer `AGENTS.md`, contratos congelados `DR-*`, roadmap enlazado, PR abiertos, último CI y decisión PO aplicable. **No sobrescribir contratos explícitos.**
2. Seleccionar **un** ticket P0/P1 del roadmap sin dependencias bloqueantes; verificar código y pruebas existentes para no reconstruir funciones ya desarrolladas.
3. Trabajar exclusivamente en una rama aislada; no realizar cambios sobre `main` ni refactorizaciones ajenas al ticket. Preservar aislamiento de equipos y revisiones.
4. Ejecutar los tests relevantes y, según alcance: `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` y validadores locales de `scripts/qa`. No utilizar servicios, secretos o datos reales para la fase de desarrollo.
5. Publicar evidencia `EC-ID → archivos → commit/PR → SHA → test/run → resultado → defectos → revisor`. Un CI PASS de otro SHA no sirve; documentación sin prueba no convierte el resultado en aceptado.
6. Registrar riesgos nuevos, fallos, bloqueos y acciones manuales necesarias. Si la tarea requiere autorización, no saltar la espera ni sustituir resultado real con mock.
7. Abrir PR revisable con cambios acotados. **No merge, no despliegue, no mutación DB real, no acceso prod ni gasto sin autorización expresa del Product Owner.**

## Prioridad y cierre

**Primer corte:** `EC-01` (diagnosticar los últimos production-smoke fallidos) y `EC-02` (candidatura para un segundo negocio/ambiente aislado). Después `EC-03` (pedido, pago, inventario y consistencia), `EC-04/05` (boutique móvil y panel), `EC-06/07` (seguridad y entrega repetible), `EC-08` (aceptación comercial). `EC-09` es SaaS posterior, **no** bloquea la primera venta.

**Gate comercial:** cero defectos P0/P1, once criterios de aceptación con evidencias reproducibles, UAT del comercio, restauración/rollback probados, costo y soporte acordados, firma de aceptación y decisión **GO** explícita. Hasta entonces: **NO-GO**.

**Fuera del paquete inicial:** POS, automatización de redes sociales, multi-sucursal, CRM avanzado o billing SaaS completo. El comercio puede comprar extensiones independientes después de la versión mínima aceptada.
