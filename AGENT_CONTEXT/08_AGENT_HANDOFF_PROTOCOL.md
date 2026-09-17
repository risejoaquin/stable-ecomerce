# Agent Handoff Protocol

## Purpose

Permitir que Codex y Antigravity se sustituyan sin perder trabajo.

## Before work

Leer:
1. `00_READ_FIRST.md`
2. `01_CURRENT_STATE.md`
3. archivo de bloque asignado
4. `06_ACCEPTANCE_CRITERIA.md`
5. `07_DO_NOT_TOUCH.md`
6. `10_CURRENT_TASK_TEMPLATE.md`
7. `11_HANDOFF_TEMPLATE.md`

## Before stopping

Actualizar:
- current task
- completed items
- pending items
- last command
- last result
- changed files
- tests run
- blockers
- next exact action

## Rule

El siguiente agente continúa.

NO:
- reiniciar fase;
- reinterpretar alcance;
- volver a hacer tareas PASS sin razón;
- avanzar roadmap.
