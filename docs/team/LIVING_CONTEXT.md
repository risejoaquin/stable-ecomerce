# Contexto Vivo — Estado Operativo Persistente del Proyecto

**Fecha de Último Corte Documental:** 2026-10-01 / 2026-10-02, hora local Sonora (UTC−07).
**Propósito:** Registro canónico del estado operativo real y verificado del repositorio, infraestructura y tareas activas.
**Invariante de Veracidad:** Actualizar exclusivamente con evidencia concreta (SHAs de Git, lecturas de API, logs de terminal, tickets Jira). Señalar siempre la fuente de evidencia; nunca inventar enlaces, PRs o estados de PASS.

---

## 1. Protocolo de Mantenimiento

Para preservar la integridad del contexto vivo:
1. **Actualización Obligatoria**: Toda decisión o hito verificado debe registrarse con: fecha, responsable, hecho confirmado, fuente verificable, impacto en contratos y siguiente paso.
2. **Distinción entre Hechos y Suposiciones**: Un reporte verbal o plan no es un hecho verificado hasta que se presente evidencia de ejecución y código de salida.
3. **Manejo de Conflictos**: Si existe discrepancia entre la documentación y la realidad técnica (e.g. Railway auto-deploy o versiones de dependencias), se debe registrar explícitamente como `CONFLICT` o `DRIFT` en `docs/team/KNOWN_DOCUMENTATION_DRIFT.md` sin sobrescribir silenciosamente.
4. **Protección de Datos Sensibles**: Prohibido registrar tokens, contraseñas, URLs de conexión con credenciales o datos privados de usuarios.

---

## 2. Matriz de Estado Confirmado al Corte

| Dominio / Componente | Estado Real y Evidencia Confirmada | Riesgo Identificado | Próxima Acción Inmediata |
|---|---|---|---|
| **GitHub Producto** | Repositorio `risejoaquin/stable-ecomerce`. `origin/main` en commit SHA `0bcc9e4e326bfc6046e78d7e5e5d579fecf37721`. | Desfase si se mezclan branches sin pull rebase. | Ejecutar `git fetch origin` antes de crear worktrees. |
| **Checkout Local Joaquín** | Rama `main` en commit `d63f8c6`, directorio untracked `?? docs/context/`. | Riesgo de sobreescritura accidental si se corre `git checkout` o `git clean`. | Preservar checkout principal intacto. Toda tarea debe correr en worktree aislado. |
| **G1 CODEOWNERS** | **PASS confirmado**: 48 reglas sintácticas y 10 casos de prueba offline validados limpiamente. Baseline SHA: `fa4026cd03fcd5f663dc40c5d262e3d24afd621a`. | El test offline no comprueba que GitHub aplique la protección sin el ruleset activo. | Mantener baseline como referencia autoritativa. |
| **G2 CODEOWNERS (Local)** | Worktree aislado `worktrees/sb-codeowners-v11`, rama `docs/ccp-40-codeowners-shared-v11` off `0bcc9e4`. Archivo `.github/CODEOWNERS` modificado; `git diff --check` arrojó exit code 0. Suite de documentación instalada. | Pendiente de PR formal y revisión de pares. | Preparar PR formal cuando la autoridad lo autorice. |
| **GitHub Ruleset Remoto** | Ruleset ID `23977496` (`main-production-protection`). Exige 1 aprobación y checks obligatorios: `quality`, `e2e`, `aggregate`. La revisión de CODEOWNERS está desactivada en la regla remota (`require_code_owner_review=false`). | Modificar reglas remotas sin test puede bloquear pushes legítimos. | No mutar el ruleset remoto sin plan de reversión probado. |
| **PR #16 Draft** | PR #16 (`docs/ccp-40-antigravity-governance`) abierto en estado **Draft** en GitHub. Modifica `AGENTS.md` y `CONTRIBUTING.md` para actualizar de Codex a Antigravity CLI. | Conflicto de merge si otros agentes tocan `AGENTS.md` o `CONTRIBUTING.md`. | **PROHIBIDO editar `AGENTS.md` o `CONTRIBUTING.md`** en esta wave. |
| **Railway Producción** | **autoDeploy=false confirmado por el usuario**: Postcheck verificado tras mutación de `serviceInstanceAutoDeployUpdate` en 2026-10-01. Lectura posterior confirmó `enabled: false`. | Asumir falsamente que merge a `main` despliega a producción. | **No tratar merge como deploy**. Despliegue a producción requiere disparo manual por Joaquín. |
| **Jira Enlaces Legacy (Wave 3)** | **41 enlaces legacy NO REPARADOS**: Identificados con direcciones o relaciones presuntamente incorrectas en la auditoría previa de Wave 3. No se ha ejecutado ninguna corrección masiva. | Corrupción del grafo de dependencias en Jira si se aplican scripts sin backup. | Obtener export/backup de los 41 pares y planificar reparación quirúrgica con aprobación humana. |
| **Orquestador Joaquín** | Directorio externo `Stable-Ecommerce-Orchestrator`. Antigravity CLI (`agy`) + worktrees aislados + monitor en sondeo cada 10 s. Wave 3 anterior interrumpida; SUMMARY inconsistente. | Estado terminal de procesos no determinista. | Hardening del orquestador y cierre de wave antes de nuevas mutaciones. |
| **Orquestador Julián** | Waves R0 a R4 registradas como PASS según reporte verbal y auditoría de Julián / ChatGPT Web. R5 CCP-43 Fase A pendiente de autorización. | Depender de reportes sin verificación de logs crudos. | Verificar reportes y artefactos antes de dar por cerrada una wave. |
| **CCP-43 (Web POS UI)** | Asignado a Julián (`@Julian716`). En estado Jira `En curso`. Fase A (UI con mocks en memoria) activa; Fase B (integración real) bloqueada formalmente. | Intentar conectar con backend real prematuramente. | Mantener Fase A desacoplada; no usar `POST /api/pos/sales` real ni marcar Done en Jira. |
| **CCP-39 (Web POS Backend)** | Asignado a Rogelio (`@bonjourrog`). En estado Jira `En curso`. Desarrollo independiente de backend, schemas y RPC de decremento atómico. | Divergencia con contratos de OpenAPI. | Seguir estrictamente `docs/engineering/client-01/09_POS_API_CONTRACT.md`. |
| **Línea Base de Vulnerabilidades** | `npm audit --omit=dev` ejecutado en host: **3 vulnerabilidades activas** (1 low en `dompurify`, 1 moderate en `ip-address`, 1 high en `multer`). Diverge de AGENTS.md (2 mod, 1 high). | El override de `ip-address` en 10.5.0 no cubre los nuevos avisos `<=10.7.0`. | Investigar parches compatibles para `multer` y `ip-address` bajo control de cambios. |
| **Continuidad Documental en CI (`GATE-09` / `PL20`)** | **LOCAL_ONLY (Remediado F1-F6)**: Gate `doc_continuity` en `TEST-DOC-IMPACT.ps1` con wrapper `Invoke-Git` (PS 5.1/pwsh), parser de hunks para listas Markdown (+, -, *), BaseRef unificado con `BEFORE_SHA` / `GITHUB_EVENT_BEFORE`. `quality-gate.yml` con checkout completo (sin `--depth=100`) y aggregate job blindado con `if: always()` y enforce step. Eliminado archivo huérfano F3. Rama `docs/ccp-40-assistant-context-continuity` en worktree `sb-docs-continuity`. | Pendiente de PR formal. | Abrir Pull Request formal y revisar con codeowners. |

---

## 3. Registro Histórico de Entradas Verificadas

### 2026-10-01 / 2026-10-02 — CCP-40 — Validación G1 y Aislamiento G2 de CODEOWNERS
- **Estado:** VERIFIED_LOCAL (G1) / IMPLEMENTED_LOCAL (G2)
- **Responsable:** Joaquín (`@risejoaquin`)
- **Fuente de Evidencia:** Ejecución de suite offline en commit `fa4026cd03fcd5f663dc40c5d262e3d24afd621a` (10/10 tests PASS); worktree `sb-codeowners-v11` sobre base `0bcc9e4`.
- **Hecho Confirmado:** 48 reglas sintácticas validadas. Archivo `.github/CODEOWNERS` modificado localmente en worktree G2 sin errores de sintaxis (`git diff --check` exit 0).
- **Riesgos y Contratos:** No altera contratos funcionales. Sin push ni PR todavía.
- **Acción Siguiente:** Mantener aislado en su worktree hasta autorización de PR.

### 2026-10-01 — INFRA — Desactivación de autoDeploy en Railway Producción
- **Estado:** PROD_VERIFIED
- **Responsable:** Joaquín (`@risejoaquin`)
- **Fuente de Evidencia:** Confirmación directa del usuario y lectura de API `serviceInstanceAutoDeployStatus` arrojando `enabled: false`.
- **Hecho Confirmado:** El merge a la rama `main` en GitHub no desencadenará builds ni despliegues automáticos al entorno productivo.
- **Riesgos y Contratos:** Los despliegues a producción ahora requieren intervención manual consciente.
- **Acción Siguiente:** Actualizar runbooks y guías operativas (`LOCAL_ENGINEERING_WORKFLOW.md`, `KNOWN_DOCUMENTATION_DRIFT.md`).

### 2026-10-01 — CCP-40 — Auditoría de Enlaces Jira Legacy Wave 3
- **Estado:** BLOCKED / REQUIRES_HUMAN_INTERVENTION
- **Responsable:** Joaquín (`@risejoaquin`)
- **Fuente de Evidencia:** Reporte de auditoría de Wave 3 identificando 41 enlaces de issues con mapeos erróneos o inconsistentes.
- **Hecho Confirmado:** Los 41 enlaces permanecen intactos (**NO REPARADOS**) en Jira. No se ejecutó ningún script destructivo o de mutación ciega.
- **Riesgos y Contratos:** La ejecución de modificaciones sin confirmación previa podría corromper la trazabilidad histórica de Jira.
- **Acción Siguiente:** Preparar tabla formal de mapeo de 41 pares y someterla a revisión humana antes de ejecutar cualquier mutación vía API.

### 2026-10-01 — GOV — Estado del PR #16 Draft (Gobernanza Antigravity)
- **Estado:** PR_OPEN (Draft)
- **Responsable:** Joaquín (`@risejoaquin`)
- **Fuente de Evidencia:** GitHub PR #16 `docs/ccp-40-antigravity-governance`.
- **Hecho Confirmado:** PR #16 contiene las modificaciones planificadas para actualizar `AGENTS.md` y `CONTRIBUTING.md` al nuevo flujo con Antigravity CLI.
- **Riesgos y Contratos:** Editar `AGENTS.md` o `CONTRIBUTING.md` en worktrees concurrentes ocasionará conflictos de merge directos.
- **Acción Siguiente:** Bloquear modificaciones a dichos archivos en las waves actuales hasta el merge o rebase de PR #16.

### 2026-10-01 / 2026-10-02 — CCP-40 — Adopción de Política GOV-DOC-001 y Auditorías AUDIT_ENV / AUDIT_GOV
- **Estado:** IMPLEMENTED_LOCAL
- **Responsable:** Joaquín (`@risejoaquin`)
- **Fuente de Evidencia:** Reportes crudos `AUDIT_ENV/REPORT.md` (exit 0) y `AUDIT_GOV/REPORT.md` (exit 0) en directorio de resultados `doc-gov-20261001-233633-6762c9`.
- **Hecho Confirmado:** Se completaron las auditorías de entorno local y gobernanza CI sin mutaciones en el repositorio. Se documentaron 8 recomendaciones operativas y 6 vectores de falla del gate documental. Se redactó la suite documental de continuidad en `docs/team/`.
- **Riesgos y Contratos:** Integrar el gate en CI requiere modificar `.github/workflows/quality-gate.yml` y generar la dimensión PL20 sin alterar los checks existentes.
- **Acción Siguiente:** `EDIT_CI` actualiza script y workflow; `EDIT_DOCS` formaliza la documentación.

### 2026-10-01 / 2026-10-02 — CI — Hard Gate de Continuidad Documental Integrado en quality-gate.yml
- **Estado:** LOCAL_ONLY
- **Responsable:** Joaquín (`@risejoaquin`)
- **Fuente de Evidencia:** `scripts/governance/TEST-DOC-IMPACT.ps1`, `.github/workflows/quality-gate.yml`, pruebas de control positivo y negativo (exit codes 0 y 2), y `git diff --check` arrojando exit code 0.
- **Hecho Confirmado:** Se integró el paso `Documentation continuity gate` en el job `quality` de `.github/workflows/quality-gate.yml` con ejecución bajo PowerShell (`pwsh`), checkout con `fetch-depth: 0` y `git fetch origin main --depth=100`, soporte estricto de `-Mode Committed` para CI, resolución de base que evita falsos PASS en pushes a `main` (`baseSha == headSha` detectado y conmutado a `HEAD~1` o `BEFORE_SHA`), salvaguardas antifraude (tamaño > 100B, diff aditivo, formato estructurado en `DECISION_LOG.md` y `LIVING_CONTEXT.md`), soporte para exención justificada `[NO_DOC_IMPACT: <motivo >= 15 chars>]`, y generación de la dimensión `doc_continuity` en `pl20-evidence/quality.json` y `pl20-evidence/quality-gate.json`. La propuesta permanece estrictamente en modo **LOCAL_ONLY** dentro del worktree `sb-docs-continuity` hasta su revisión y merge en `main`.
- **Riesgos y Contratos:** No altera contratos congelados de ingeniería ni debilita los gates existentes (`lint`, `unit_tests`, `build`, `secret_scan`, `core_regression`, `security_baseline`, `e2e`). Se explicita la limitación de que el gate no realiza validación semántica automática.
- **Acción Siguiente:** Preparar Pull Request formal hacia `origin/main` cuando el Technical Authority lo instruya.

### 2026-10-02 — CCP-40 — Remediación Integral de Gobernanza CI y Hallazgos F1-F6 (Continuidad Documental)
- **Estado:** VERIFIED_LOCAL
- **Responsable:** Joaquín (`@risejoaquin`)
- **Fuente de Evidencia:** `scripts/governance/TEST-DOC-IMPACT.ps1`, `.github/workflows/quality-gate.yml`, eliminación verificada de archivo huérfano F3, batería de pruebas de regresión en repositorios scratch (`test_added_lines.ps1`, `test_diff.ps1`, matriz de casos F1-F6), y `git diff --check` arrojando exit code 0.
- **Hecho Confirmado:**
  1. *F1 HIGH*: Parser de líneas añadidas reconstruido con `Get-AddedLinesFromDiff` basado en límites de hunks de unified diff (`@@`), aceptando listas Markdown iniciadas con `+`, `-`, `*` y texto normal sin aceptar accidentalmente diff headers (`+++ b/...`).
  2. *F2 HIGH*: Wrapper `Invoke-Git` implementado con ejecución bajo `$ErrorActionPreference = 'SilentlyContinue'` y bloque `try/finally` estricto; neutraliza abortos por `NativeCommandError` en Windows PowerShell 5.1 y `pwsh` ante advertencias CRLF emitidas a stderr por Git, preservando `$LASTEXITCODE`.
  3. *F3 MEDIUM*: Archivo corrupto huérfano con dump de git diff en la raíz eliminado quirúrgicamente tras verificación de ruta y contenido; preservación de archivos legítimos sin recurrir a `git clean`.
  4. *F4 MEDIUM*: Unificación de variables `BEFORE_SHA`, `GITHUB_EVENT_BEFORE` y `GITHUB_BASE_REF` en script y workflow; validación estricta de referencias con salida estructurada y código de error 2 ante refs no resolubles.
  5. *F5 LOW*: Remoción de la restricción redundante `--depth=100` en el checkout de CI en `quality-gate.yml`.
  6. *F6 LOW*: Blindaje del aggregate job en `quality-gate.yml`: no permite reportar PASS si la verificación documental fue omitida o falló; la dimensión general `release_gate` exige el PASS de `doc_continuity`; subida de artefacto protegida con `if: always()`; y paso `Enforce Final Aggregate Quality Gate Result` para forzar fallo determinista del pipeline si algún gate no pasa.
  7. *Principio de Autonomía de Agentes Antigravity*: Se asienta formalmente que los agentes autónomos de Antigravity ejecutan de forma rutinaria tareas locales de implementación, pruebas y generación de reportes técnicos crudos en worktrees, mientras que la autoridad humana retiene en exclusiva las aprobaciones y mutaciones sensibles (commits, pushes, PRs, Jira, Railway, producción).
- **Riesgos y Contratos:** Ningún contrato de negocio ni arquitectura alterado. Modificaciones confinadas a tooling de gobernanza CI y documentación viva.
- **Acción Siguiente:** Proceder a la verificación cruzada de pruebas locales y documentar el informe final.
