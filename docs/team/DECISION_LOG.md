# Registro de Decisiones de Ingeniería y Gobernanza — Append-Only

**Estado:** Registro cronológico append-only de decisiones técnicas, operativas y arquitectónicas.
**Regla de Integridad:** Prohibido reescribir o borrar decisiones pasadas. Toda alteración o rectificación se debe asentar como una nueva decisión supersesora (`SUPERSEDED`). Las decisiones que modifiquen contratos congelados (`docs/engineering/client-01/`) requieren adicionalmente una enmienda formal de Architecture Decision Record (ADR) según `GOV-ENG-006`.

---

## 1. Tabla Histórica de Decisiones

| ID | Fecha | Decisión | Evidencia y Estado | Responsable | Seguimiento y Gates |
|---|---|---|---|---|---|
| **D-2026-10-01-01** | 2026-10-01 | Adoptar CODEOWNERS de **propiedad compartida y controlada**, con responsables claros por dominio técnico (`@bonjourrog` backend, `@Julian716` frontend, `@risejoaquin` arquitectura/release); no transferir la autoridad final de release en producción. | G1 offline 10/10 PASS y G2 local preparado en worktree `sb-codeowners-v11`. Estado: **IMPLEMENTED_LOCAL** (sin merge en `main`). | Joaquín (`@risejoaquin`) | Preparar PR formal; activación de protección remota solo tras merge validado. |
| **D-2026-10-01-02** | 2026-10-01 | Railway producción: deshabilitar `autoDeploy` automático del servicio estable de ecommerce para desacoplar el merge a `main` del despliegue productivo. | Confirmación de usuario y lectura posterior de API `serviceInstanceAutoDeployStatus` arrojando `enabled: false`. Estado: **PROD_VERIFIED**. | Joaquín (`@risejoaquin`) | Revalidar antes de cada release; documentar procedimiento de despliegue manual en `LOCAL_ENGINEERING_WORKFLOW.md`. |
| **D-2026-10-01-03** | 2026-10-01 | Continuar CCP-43 (Web POS) en Fase A exclusivamente con mocks contractuales en memoria; Fase B (integración real con `POST /api/pos/sales` y base de datos) queda bloqueada hasta la entrega formal de backend (CCP-39/12/13/14/22). | Definición en Jira CCP-43 y contratos congelados `09_POS_API_CONTRACT.md`. Estado: **ACCEPTED**. | Julián / Joaquín | Respetar gates contractuales; no marcar Done en Jira basándose en tests de mocks. |
| **D-2026-10-01-04** | 2026-10-01 | Mantener documentación de onboarding local, contexto vivo y registro de decisiones directamente versionados en el repositorio (`docs/team/`); evitar duplicar gobernanza autoritativa existente (`docs/engineering/`). | Propuesta de continuidad documental en rama `docs/ccp-40-assistant-context-continuity`. Estado: **ACCEPTED**. | Joaquín (`@risejoaquin`) | Incorporar mediante PR formal y enlazar desde `ASSISTANT_START_HERE.md` y `docs/README.md`. |
| **D-2026-10-01-05** | 2026-10-01 / 2026-10-02 | **Adopción obligatoria de la Política de Continuidad Documental `GOV-DOC-001`**. Todo cambio técnico o de infraestructura que altere el setup local (`LOCAL_ENVIRONMENT_SETUP.md`) o el workflow diario (`LOCAL_ENGINEERING_WORKFLOW.md`) debe actualizar obligatoriamente `DECISION_LOG.md`, `LIVING_CONTEXT.md` y la guía afectada **EN EL MISMO PR**, o justificar explícitamente `[NO_DOC_IMPACT: <motivo >= 15 caracteres>]`. Toda decisión tomada fuera de Git (chat, Jira, consola Railway, scripts externos del orquestador) obliga a abrir un PR puramente documental en `risejoaquin/stable-ecomerce`. | Auditorías completadas: `AUDIT_ENV/REPORT.md` (exit 0) y `AUDIT_GOV/REPORT.md` (exit 0). Estado: **DECIDED**. Permiso de scope actual: Modo WRITE limitado estrictamente a `ASSISTANT_START_HERE.md` y `docs/team/*.md` en worktree aislado `sb-docs-continuity`. Prohibido mutar `AGENTS.md`, `CONTRIBUTING.md`, `.github/CODEOWNERS`, scripts de CI o el checkout principal en esta wave. | Joaquín (`@risejoaquin`) | Implementación de validación antifraude en `TEST-DOC-IMPACT.ps1` e integración como dimensión `doc_continuity` en CI PL20 vía ticket `EDIT_CI`. |
| **D-2026-10-01-06** | 2026-10-01 / 2026-10-02 | **Integración del Hard Gate de Continuidad Documental en CI (`GATE-09` / `PL20`)**. Incorporar el paso `Documentation continuity gate` en el job `quality` de `.github/workflows/quality-gate.yml` con `pwsh` y ejecución en modo `Committed`, checkout con `fetch-depth: 0` y `git fetch origin main`, resolución robusta de base para PR (`origin/main...HEAD`) y push a main (`BEFORE_SHA` / `HEAD~1` para evitar falso PASS por base vacía o idéntica a HEAD), verificación antifraude de contenido (>100B, diff aditivo, IDs estructurados), soporte para exención formal `[NO_DOC_IMPACT: <justificación >= 15 chars>]`, e integración en la dimensión `doc_continuity` del reporte de evidencia PL20 (`quality.json` y `quality-gate.json`). Propuesta marcada como **LOCAL_ONLY** hasta su merge formal en `main`. | Hardening de `TEST-DOC-IMPACT.ps1`, actualización de `quality-gate.yml` y validación local de pruebas positivas y negativas controladas (exit codes 0 y 2). Estado: **LOCAL_ONLY** (propuesta en worktree `sb-docs-continuity`, pendiente de PR y merge en `main`). | Joaquín (`@risejoaquin`) | Incluir en Pull Request formal de continuidad documental; no mutar main remoto ni rulesets antes de la revisión técnica. |
| **D-2026-10-02-01** | 2026-10-02 | **División de Autoridad y Autonomía de Agentes Antigravity & Remediación F1-F6 de Continuidad**: Los agentes autónomos de Antigravity (`agy`) ejecutan de forma autónoma la implementación rutinaria (lectura, edición local, suite de pruebas, validación de gates y recolección de evidencia técnica cruda), mientras que la autoridad humana (`@risejoaquin`) retiene con exclusividad las aprobaciones y mutaciones sensibles (commits, pushes, creación/merge de PRs, modificación de reglas en GitHub, alteraciones en Jira/Railway y despliegues a producción). Se resuelven integralmente los hallazgos F1 a F6 de la auditoría independiente de gobernanza CI y continuidad documental. | Remediación de `TEST-DOC-IMPACT.ps1` y `quality-gate.yml`, eliminación de artefacto huérfano F3, batería de pruebas de regresión offline y validación estructural completada en worktree `sb-docs-continuity`. Estado: **DECIDED**. | Joaquín (`@risejoaquin`) | Aplicar en flujos locales de orquestación y reflejar en `LIVING_CONTEXT.md` y `LOCAL_ENGINEERING_WORKFLOW.md`. |

---

## 2. Detalle de Decisiones Recientes y Análisis de Impacto

### Detalle de D-2026-10-01-05: Política de Continuidad Documental GOV-DOC-001
- **Fecha de Aprobación:** 2026-10-01T23:41:00-07:00 / 2026-10-02.
- **Autoridad:** Technical & Release Authority (`@risejoaquin`).
- **Estado:** `DECIDED`.
- **Motivo Técnico:**
  Los informes de auditoría `AUDIT_ENV` y `AUDIT_GOV` evidenciaron una deriva crítica silenciosa: decisiones operativas fundamentales (e.g. desactivación de `autoDeploy` en Railway, divergencia en dependencias vulnerables, uso de PowerShell 5.1 frente a pwsh 7+, scripts fallidos como `clean` en Windows) no se reflejaban de forma síncrona en la documentación de ingeniería, provocando desorientación en asistentes y desarrolladores.
- **Impacto en Entorno Local (`LOCAL_ENVIRONMENT_SETUP.md`):**
  Obligación de mantener documentadas las versiones reales, diferencias entre Windows PowerShell 5.1 y pwsh 7+, resolución de variables (`DATABASE_URL` vs `SUPABASE_DB_URL`), advertencia contra directorios sincronizados por OneDrive y aislamiento de `node_modules` en worktrees.
- **Impacto en Workflow Diario (`LOCAL_ENGINEERING_WORKFLOW.md`):**
  Formalización del ciclo completo diario: ChatGPT Web -> empaquetado ZIP -> N agentes Antigravity CLI en worktrees aislados -> monitor cada 10 s -> reportes con evidencia cruda -> auditorías independientes -> hard gates de CI -> aprobación humana antes de mutaciones remotas -> despliegue manual en Railway.
- **Impacto en Gobernanza de CI:**
  Establecimiento de las especificaciones para que el agente `EDIT_CI` convierta `TEST-DOC-IMPACT.ps1` en un gate estricto con validación antifraude (no stubs vacíos, diffs aditivos mínimos, validación sintáctica) y dimensión formal en el modelo de evidencia PL20.
- **Permisos y Restricciones de Scope en esta Wave:**
  El agente `EDIT_DOCS` opera exclusivamente sobre `ASSISTANT_START_HERE.md` y `docs/team/*.md` en el worktree `sb-docs-continuity`. Se preserva intacto el checkout principal, sin tocar `AGENTS.md` ni `CONTRIBUTING.md` (reservados para PR #16 draft) ni `.github/CODEOWNERS` ni scripts CI.

### Detalle de D-2026-10-01-06: Gate de Continuidad Documental en CI (LOCAL_ONLY)
- **Fecha de Propuesta:** 2026-10-01 / 2026-10-02.
- **Autoridad:** Technical & Release Authority (`@risejoaquin`).
- **Estado:** `LOCAL_ONLY` (propuesta lista en rama `docs/ccp-40-assistant-context-continuity`, no activa en remoto hasta el merge).
- **Motivo Técnico:**
  `AUDIT_GOV` identificó 6 vulnerabilidades críticas de falso PASS en el gate documental original: validación ciega de paths sin inspección de contenido, ausencia total en GitHub Actions (`quality-gate.yml`), falta de la dimensión `doc_continuity` en la evidencia PL20, fallo en clones shallow de CI por falta de `origin/main`, falso PASS garantizado en eventos push a `main` al comparar `HEAD` consigo mismo, e inexistencia de parser para la exención `[NO_DOC_IMPACT: ...]`.
- **Implementación Concreta:**
  1. `scripts/governance/TEST-DOC-IMPACT.ps1`: Reescribir con resolución robusta de base (`origin/main` en PR; `BEFORE_SHA` / `HEAD~1` en push; salvaguarda contra `baseSha == headSha`), modo `Committed` estricto para CI (evitando falsos positivos o falsos PASS por untracked files), antifraude (mínimo 100 bytes, diff aditivo, formato estructurado en `DECISION_LOG.md` y `LIVING_CONTEXT.md`), y parser de exención formal (`[NO_DOC_IMPACT: ...]` >= 15 chars).
  2. `.github/workflows/quality-gate.yml`: Incorporación del paso `Documentation continuity gate` en el job `quality` tras los checks de seguridad, configuración de `fetch-depth: 0` y `git fetch origin main`, e incorporación de la dimensión `doc_continuity` en `quality.json` y `quality-gate.json`.
- **Limitaciones Conocidas del Pipeline:**
  1. *Dependencia de Fetch*: En CI, un clon shallow sin acceso a la rama base produce error; mitigado mediante `fetch-depth: 0` y `git fetch origin main --depth=100`.
  2. *Base en Push a Main*: En pushes directos o merges a `main`, `origin/main` y `HEAD` son idénticos; el script detecta la igualdad de SHAs y conmuta automáticamente a `BEFORE_SHA` o `HEAD~1` para evitar un falso PASS con base vacía.
  3. *Validación Estructural vs. Semántica*: El pipeline verifica la existencia física, tamaño mínimo, no vacuidad del diff y presencia de formatos estructurados (IDs, fechas, estados). **NO realiza validación semántica automática** de la corrección arquitectónica o técnica de las decisiones; dicha validación continúa siendo responsabilidad exclusiva del revisor humano y codeowners.
  4. *Aislamiento en Worktrees*: En desarrollo local activo, los archivos nuevos permanecen como untracked hasta ser committeados; localmente se debe utilizar `-Mode WorkingTree` para pruebas intermedias y `-Mode Committed` antes de solicitar el PR.

### Detalle de D-2026-10-02-01: Autonomía de Agentes Antigravity y Remediación Integral F1-F6
- **Fecha de Aprobación:** 2026-10-02.
- **Autoridad:** Technical & Release Authority (`@risejoaquin`).
- **Estado:** `DECIDED`.
- **Motivo Técnico y Alcance:**
  La auditoría independiente de gobernanza CI y continuidad documental detectó fallos operativos y de análisis en el pipeline: rechazo indebido de listas Markdown con `+` (F1), vulnerabilidad a `NativeCommandError` en Windows PowerShell 5.1 ante advertencias stderr de CRLF (F2), presencia de un archivo huérfano con dump de diff en el worktree (F3), desalineación de variables de entorno para base SHA en CI (F4), restricción redundante de profundidad `--depth=100` en checkout (F5), y riesgo de falso PASS en el job aggregate ante dimensiones faltantes o fallidas (F6).
- **Decisión de Gobernanza sobre Agentes Autónomos:**
  Se ratifica la arquitectura de ejecución desacoplada: los agentes autónomos de Antigravity (`agy`) asumen la ejecución completa de implementación rutinaria en local (inspección de código, creación de worktrees, modificaciones mínimas, tests unitarios, validación de gates y generación de evidencia cruda en `REPORT.md`). La autoridad humana (`@risejoaquin`) retiene soberanía total y exclusiva sobre operaciones sensibles: `git commit`, `git push`, creación y merge de Pull Requests, configuración de reglas en GitHub, modificaciones en Jira o Railway, y despliegues a entornos productivos.
- **Remediaciones Implementadas:**
  1. *F1 HIGH*: Parser de líneas añadidas en `TEST-DOC-IMPACT.ps1` reconstruido con `Get-AddedLinesFromDiff` basado en delimitadores de hunks (`@@`), aceptando listas Markdown iniciadas con `+`, `-`, `*` y texto plano, bloqueando diff headers sin depender de regexes frágiles sobre el prefijo `+`.
  2. *F2 HIGH*: Wrapper `Invoke-Git` implementado con aislamiento de errores (`$ErrorActionPreference = 'SilentlyContinue'` y bloque `try/finally` estricto), evitando abortos por `NativeCommandError` en PowerShell 5.1 ante advertencias de CRLF emitidas por Git a stderr, preservando `$LASTEXITCODE`.
  3. *F3 MEDIUM*: Eliminación selectiva del archivo corrupto huérfano en la raíz del worktree mediante inspección de contenido y ruta literal, preservando archivos de documentación y scripts legítimos sin recurrir a `git clean`.
  4. *F4 MEDIUM*: Unificación de soporte para `BEFORE_SHA`, `GITHUB_EVENT_BEFORE` y `GITHUB_BASE_REF` en `TEST-DOC-IMPACT.ps1` y `quality-gate.yml`, con validación estricta de refs (`git rev-parse --verify`) y salida limpia con exit code 2 ante referencias inválidas.
  5. *F5 LOW*: Remoción del flag redundante `--depth=100` en el paso de fetch de `quality-gate.yml`.
  6. *F6 LOW*: Blindaje del aggregate job en `quality-gate.yml`: la dimensión `doc_continuity` nunca puede reportar PASS si falta en la evidencia o fue omitida; el gate general `release_gate` exige el PASS explícito de `doc_continuity`; la subida de evidencia `pl20-evidence-quality-gate` se preserva con `if: always()`; y un paso final `Enforce Final Aggregate Quality Gate Result` garantiza la terminación en fallo si el aggregate no es exitoso.

---

## 3. Plantilla para Futuras Decisiones

Toda nueva decisión debe incorporarse al final de la tabla superior utilizando la siguiente convención:

```markdown
| D-AAAA-MM-DD-NN | AAAA-MM-DD | [Decisión concisa] | [Fuente de evidencia + Estado: PROPOSED/ACCEPTED/DECIDED/SUPERSEDED] | [Responsable] | [Acción de seguimiento y gates] |
```

> **Invariante de Seguridad:** Nunca incluir en las descripciones secretos, contraseñas, tokens de acceso ni información personal de usuarios o clientes.
