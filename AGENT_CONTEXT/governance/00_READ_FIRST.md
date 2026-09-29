# CLIENT 01 DELIVERY — READ FIRST

Proyecto: Stable Ecommerce / Selfcare Sinners  
Repositorio: `risejoaquin/stable-ecomerce`  
Rama objetivo: `main`  
Fase activa: `Client 01 Delivery Scope` (`PLANNING_AND_DESIGN = CLOSED_FOR_CLIENT_01`)
Modelo de ejecución: orquestación de agentes con gobernanza formal

## Regla principal

Este paquete NO autoriza modificar comportamiento funcional sin aprobación formal (`FUNCTIONAL_DEVELOPMENT = NOT_AUTHORIZABLE`).
Fases históricas QA/RELEASE E y POST-LAUNCH 20 se encuentran formalmente cerradas (`CLOSED / ROADMAP PASS`).

## No reabrir macrofases cerradas

No reabrir:

- EMERGENCY-DRY-01..05
- EMAIL PRODUCTION A..C
- UIX SYSTEM A..C
- PERFORMANCE / FRONTEND D

Si aparece una regresión, tratarla como:

`QA / RELEASE E HOTFIX N`

## Flujo

```text
Block A ─┐
Block B ─┼─ parallel execution
Block C ─┘
          ↓
Final integration
          ↓
Evidence handoff
          ↓
ChatGPT Web validation
```
