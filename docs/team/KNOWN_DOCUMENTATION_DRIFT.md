# Divergencias Documentales Conocidas — Registro de Deriva Técnica (Drift)

**Estado:** Registro activo de discrepancias identificadas entre la documentación histórica y la realidad del sistema.
**Regla Fundamental:** **PROHIBIDO corregir estas discrepancias silenciosamente** o mediante refactors oportunistas en tareas no relacionadas. Cada divergencia debe reconciliarse mediante un ticket Jira específico, un Pull Request dedicado, revisión de codeowners y evidencia verificable.

---

## 1. Tabla de Divergencias Activas

| ID | Documento Afectado | Afirmación Documentada | Realidad Técnica Verificada | Acción de Reconciliación Planificada |
|---|---|---|---|---|
| **DRIFT-01** | `AGENTS.md` | Presenta a **Codex** como el agente ejecutor local por defecto, con reglas de interacción obsoletas. | El equipo opera exclusivamente con **Antigravity CLI (`agy`)** y ChatGPT Web. | **PR #16 Draft** (`docs/ccp-40-antigravity-governance`) está abierto para formalizar la transición. **PROHIBIDO editar `AGENTS.md`** en esta wave para evitar colisiones. |
| **DRIFT-02** | `CONTRIBUTING.md` | Describe un flujo simplificado de 10 pasos y afirma que el merge a `main` activa un despliegue automático. | El flujo autoritativo consta de 19 etapas (`TEAM_DEVELOPMENT_WORKFLOW.md`). El despliegue automático en Railway está desactivado (`autoDeploy=false`). | Cubierto en el alcance de PR #16 draft. **PROHIBIDO editar `CONTRIBUTING.md`** en esta wave. |
| **DRIFT-03** | `docs/engineering/TEAM_DEVELOPMENT_WORKFLOW.md` (Etapa 16) | *"Railway automated production build triggered."* | En fecha 2026-10-01 se confirmó que el servicio de producción en Railway tiene `autoDeploy=false`. El merge **no** dispara despliegues. | Enmendar formalmente la etapa 16 mediante un PR de gobernanza para reflejar el disparo manual mandatorio por parte de Joaquín (`@risejoaquin`). |
| **DRIFT-04** | `AGENTS.md` (línea 204) | *"Current known dependency baseline: 2 moderate vulnerabilities, 1 high vulnerability."* | `npm audit --omit=dev` arroja **3 vulnerabilidades**: 1 baja (`dompurify`), 1 moderada (`ip-address`), 1 alta (`multer`). El override de `ip-address` en 10.5.0 no cubre avisos recientes `<=10.7.0`. | Abrir ticket de remediación de dependencias (investigar parches para `multer` y `dompurify` bajo control de cambios). |
| **DRIFT-05** | `README.md` (línea 12) vs `package.json` | `README.md` exige *"PowerShell 7+ / Windows Terminal"*. `package.json` invoca `"powershell"` (Windows PowerShell 5.1). Host carece de `pwsh`. | La máquina de Joaquín solo dispone de PowerShell 5.1 (`powershell.exe`). CI en GitHub Actions corre bajo `pwsh`. | Documentar compatibilidad dual en `LOCAL_ENVIRONMENT_SETUP.md`. Alinear scripts de `package.json` para soportar runners agnósticos. |
| **DRIFT-06** | `package.json` (línea 11) | `"clean": "rm -rf dist server.js"` | En entornos Windows estándar (`cmd.exe`), `rm` no existe, arrojando código de error 1. | Sustituir en un PR de tooling por un script multiplataforma (e.g. `rimraf` o comando de Node `fs.rmSync`). |
| **DRIFT-07** | Jira Wave 3 (Dependencias) | Se asumía integridad total de los enlaces entre issues en Jira. | Auditoría de Wave 3 identificó **41 enlaces legacy con relaciones erróneas o invertidas**, los cuales permanecen **NO REPARADOS**. | Prohibir scripts de mutación masiva en Jira sin respaldo previo. Planificar remediación supervisada ticket por ticket. |
| **DRIFT-08** | `.env.example` vs Scripts QA | `.env.example` lista `SUPABASE_DB_URL=postgresql://...`. | `scripts/qa/database/validate-database-security.ps1` y `check-database-security.mjs` exigen estrictamente `DATABASE_URL`. | Documentar en `LOCAL_ENVIRONMENT_SETUP.md` y agregar `DATABASE_URL` a `.env.example` en próximo PR de setup. |
| **DRIFT-09** | Gate de Continuidad Documental (`CI_QUALITY_GATES.md` vs CI) | `CI_QUALITY_GATES.md` define 8 hard gates (`GATE-01` a `GATE-08`). No menciona continuidad documental. | Implementado localmente `GATE-09 Documentation Continuity` en `scripts/governance/TEST-DOC-IMPACT.ps1` e integrado en `.github/workflows/quality-gate.yml` con dimensión `doc_continuity` en evidencia PL20. Remediados hallazgos F1-F6 (listas Markdown +, wrapper Git para PS 5.1/pwsh, BaseRef alineado, checkout completo y aggregate job blindado). Estado: **LOCAL_ONLY** en worktree `sb-docs-continuity`. | Reconciliar formalmente `CI_QUALITY_GATES.md` tras el merge del PR de continuidad documental (`CCP-40`). Mantener marcado como LOCAL_ONLY hasta su despliegue en remoto. |

---

## 2. Procedimiento para Reportar y Resolver Divergencias

Cuando un desarrollador o asistente descubra una nueva divergencia:
1. **No intentar "arreglarla de paso"**: Modificar un contrato o comportamiento histórico en medio de una tarea no relacionada rompe el principio de mínimo cambio (`GOV-ENG-005`).
2. **Registrar la divergencia**: Añadir una fila a este archivo detallando: ID, documento afectado, afirmación documentada, realidad observada y propuesta de reconciliación.
3. **Reflejar en el Contexto Vivo**: Notificar el hallazgo en `docs/team/LIVING_CONTEXT.md` en la tabla de estado confirmado.
4. **Abrir ticket Jira o discusión técnica**: Escalar al Technical Authority (`@risejoaquin`) para definir el momento de su resolución.
