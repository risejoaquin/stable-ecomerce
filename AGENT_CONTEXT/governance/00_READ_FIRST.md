# QA / RELEASE E — READ FIRST

Proyecto: Stable Ecommerce / Selfcare Sinners  
Repositorio: `risejoaquin/stable-ecomerce`  
Rama objetivo: `main`  
Fase activa: `QA / RELEASE E`  
Modelo de ejecución: bloques paralelos A / B / C

## Regla principal

Este paquete NO autoriza avanzar el roadmap.

Los agentes pueden ejecutar, modificar, probar, desplegar y recopilar evidencia.

Sólo ChatGPT Web puede determinar:

- `ROADMAP FAIL`
- `QA / RELEASE E = ROADMAP PASS`
- autorización para iniciar `POST-LAUNCH 20`

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
