# ASISTENTE — LEER PRIMERO | Guía de Inicio Rápido e Índice Operativo

> [!IMPORTANT]
> **ORDEN DE AUTORIDAD Y VALIDEZ DEL CONTEXTO**:
> 1. **Contratos Congelados (`docs/engineering/client-01/`)**: Inmutables durante el desarrollo (`09_POS_API_CONTRACT.md`, schemas RPC, DTOs). Prevalecen sobre cualquier decisión ad-hoc.
> 2. **Gobernanza de Ingeniería Autoritativa (`docs/engineering/`)**: Normas canónicas de ciclo de vida (`TEAM_DEVELOPMENT_WORKFLOW.md` `GOV-ENG-001`), modelo de evidencia (`EVIDENCE_MODEL.md` `GOV-ENG-005`), control de cambios (`CHANGE_CONTROL.md` `GOV-ENG-006`), propiedad de código (`SHARED_OWNERSHIP_RULES.md` `GOV-ENG-007`) y calidad CI (`CI_QUALITY_GATES.md`).
> 3. **Contexto Operativo Continuo y Guías Vivas (`docs/team/`)**: Guías de preparación local (`LOCAL_ENVIRONMENT_SETUP.md`), workflow diario (`LOCAL_ENGINEERING_WORKFLOW.md`), política de actualización (`DOCUMENTATION_MAINTENANCE_POLICY.md`), registro de contexto (`LIVING_CONTEXT.md`), bitácora append-only (`DECISION_LOG.md`) y derivas conocidas (`KNOWN_DOCUMENTATION_DRIFT.md`).
> 4. **Memoria de Chat y Prompts**: *PROMPTS ARE EPHEMERAL*. Las instrucciones verbales o prompts de chat nunca constituyen registros autoritativos del sistema.

---

## 1. Índice Canónico de Documentación de Equipo

Para operar eficazmente en el proyecto, consulte los siguientes documentos de referencia según su objetivo:

| Documento | Propósito Operativo | Cuándo Consultarlo |
|---|---|---|
| [`docs/team/LOCAL_ENVIRONMENT_SETUP.md`](docs/team/LOCAL_ENVIRONMENT_SETUP.md) | Guía de instalación limpia, dependencias por rol, diferencias PowerShell 5.1 vs pwsh 7+, prevención de fugas de secretos y advertencias críticas de almacenamiento (no OneDrive). | Al incorporar un nuevo entorno o máquina, o cambiar dependencias de tooling. |
| [`docs/team/LOCAL_ENGINEERING_WORKFLOW.md`](docs/team/LOCAL_ENGINEERING_WORKFLOW.md) | Flujo diario completo: diseño en ChatGPT Web, empaquetado ZIP, orquestador Antigravity en worktrees aislados, monitor 10s, reportes crudos, auditorías READ_ONLY, y despliegue manual en Railway (`autoDeploy=false`). | Antes de iniciar cualquier tarea, wave de agentes o preparación de Pull Request. |
| [`docs/team/DOCUMENTATION_MAINTENANCE_POLICY.md`](docs/team/DOCUMENTATION_MAINTENANCE_POLICY.md) | Política obligatoria `GOV-DOC-001`. Exige actualizar guías de setup/workflow + `DECISION_LOG.md` + `LIVING_CONTEXT.md` en el mismo PR; sintaxis formal para exenciones `[NO_DOC_IMPACT: ...]`. | En todo cambio de código, tooling, dependencias o decisiones externas a Git. |
| [`docs/team/LIVING_CONTEXT.md`](docs/team/LIVING_CONTEXT.md) | Estado operativo verificado en vivo (SHAs base, estado G1/G2 CODEOWNERS, rulesets de GitHub, Railway autoDeploy=false, 41 enlaces Jira legacy, línea base de vulnerabilidades). | Al iniciar cualquier sesión como contexto de partida (**verificar siempre contra Git/API**). |
| [`docs/team/DECISION_LOG.md`](docs/team/DECISION_LOG.md) | Registro append-only de decisiones técnicas, operativas y de arquitectura (incluyendo `D-2026-10-01-05` de política documental). | Para consultar el histórico o asentar una nueva decisión con estado y evidencia. |
| [`docs/team/KNOWN_DOCUMENTATION_DRIFT.md`](docs/team/KNOWN_DOCUMENTATION_DRIFT.md) | Inventario activo de contradicciones conocidas entre documentación histórica y realidad técnica (e.g. `AGENTS.md` y `CONTRIBUTING.md` pendientes de PR #16). | Para no intentar corregir divergencias históricas de forma improvisada o silenciosa. |
| [`docs/team/ASSISTANT_HANDOFF_TEMPLATE.md`](docs/team/ASSISTANT_HANDOFF_TEMPLATE.md) | Plantilla estandarizada de cierre de wave y transferencia de contexto entre ChatGPT Web y Antigravity CLI. | Al finalizar una tarea o pasar la estafeta a otro ingeniero o asistente. |

---

## 2. Identidad y Arquitectura del Producto

- **Repositorio**: `risejoaquin/stable-ecomerce` (rama principal protegida: `main`).
- **Arquitectura de Software**:
  - Frontend: React 19, Vite, Tailwind CSS, Lucide Icons.
  - Backend: Node.js 22 LTS, Express, TypeScript, Zod, Pino logger.
  - Base de Datos: PostgreSQL hospedado en Supabase (RLS estricto, RPCs transaccionales).
  - Infraestructura Cloud: Railway (producción y staging desacoplados; `autoDeploy=false`).
  - Pasarelas y Comunicaciones: Stripe (PCI DSS readiness), Resend (webhooks validados vía HMAC).
- **Separación del Orquestador**:
  - El sistema de orquestación de agentes (`Stable-Ecommerce-Orchestrator`) reside en un repositorio/directorio **completamente externo y separado**.
  - **PROHIBIDO** crear o anidar scripts de orquestación o subdirectorios de agentes dentro de este repositorio de producto.

---

## 3. Matriz de Roles y Dominios de Autoridad

| Colaborador | Usuario GitHub | Dominio Técnico Exclusivo | Autorizaciones y Límites |
|---|---|---|---|
| **Joaquín** | `@risejoaquin` | Arquitectura, CI/CD, Seguridad, Gobernanza y Release Engineering | **Única Autoridad de Release**. Autoriza merges a `main`, modifica reglas remotas y ejecuta despliegues a producción en Railway. |
| **Rogelio** | `@bonjourrog` | Backend (`/server.ts`, `/src/server/`), Supabase Migrations (`/supabase/`), RPCs y API REST | Prohibido aplicar migraciones en producción sin aprobación del Technical Authority. |
| **Julián** | `@Julian716` | Frontend Storefront, Admin Command Center y Web POS UI (`/src/pages/pos/`, `/src/components/pos/`) | **CCP-43 Fase A**: UI con mocks contractuales en memoria. **CCP-43 Fase B** (integración real) bloqueada hasta la entrega de backend. |

> [!NOTE]
> **Autonomía y Autoridad (`D-2026-10-02-01`)**: Los agentes autónomos de Antigravity (`agy`) ejecutan de forma autónoma la implementación rutinaria (lectura de archivos, edición local en worktrees, ejecución de suites de prueba, validación de gates de calidad y compilación de evidencia técnica cruda). La autoridad humana (`@risejoaquin`) retiene con exclusividad las aprobaciones y mutaciones sensibles (commits, pushes, creación y merge de Pull Requests, configuración de reglas en GitHub, modificaciones en Jira o consola de Railway, y despliegues a producción).

---


## 4. Política de Mantenimiento Documental Obligatoria (`GOV-DOC-001`)

La política `GOV-DOC-001` (asentada formalmente en la decisión `D-2026-10-01-05`) exige:

1. **Sincronización en el Mismo PR**:
   - Cambios de configuración, herramientas o dependencias (`package.json`, `.env.example`, etc.) exigen actualizar `LOCAL_ENVIRONMENT_SETUP.md` + `DECISION_LOG.md` + `LIVING_CONTEXT.md`.
   - Cambios en scripts de QA, CI o flujos operativos exigen actualizar `LOCAL_ENGINEERING_WORKFLOW.md` + `DECISION_LOG.md` + `LIVING_CONTEXT.md`.
2. **Decisiones Fuera de Git**:
   - Cualquier acuerdo alcanzado en chat, Jira, Railway o scripts del orquestador externo obliga al responsable a abrir inmediatamente un PR puramente documental en este repositorio.
3. **Exención Justificada (`DOC_IMPACT=NONE`)**:
   - Si se tocan rutas monitoreadas por cambios cosméticos sin impacto operativo, se debe incluir en el commit o descripción del PR:
     `[NO_DOC_IMPACT: <Justificación técnica de mínimo 15 caracteres>]`.
4. **Declaración Obligatoria en Reportes**:
   - Todo asistente debe declarar el bloque `DOC_IMPACT` en su resumen final.

---

## 5. Invariantes de Seguridad y Comportamiento del Asistente

- **Nunca Asumir PASS sin Evidencia**: Un código de salida `0` no demuestra que una funcionalidad esté completa. Se debe adjuntar comando, exit code y salida relevante.
- **Acciones Estrictamente Prohibidas para Agentes**:
  - Nunca ejecutar: `git add .`, `git add -A`, `git reset --hard`, `git clean -fd`, `git push --force`.
  - Nunca realizar commits, pushes, merges, apertura de PRs o despliegues sin autorización humana previa.
  - Nunca ejecutar mutaciones directas en la base de datos o en Jira sin plan de reversión probado.
  - Nunca registrar tokens, contraseñas, variables de entorno sensibles o datos privados en la documentación.
- **Salvaguarda de Archivos Protegidos en esta Wave**:
  - `AGENTS.md` y `CONTRIBUTING.md` contienen referencias históricas que están siendo corregidas en el **PR #16 draft**. Está **PROHIBIDO editarlos o sobrescribirlos** para evitar conflictos.
  - `.github/CODEOWNERS` y los scripts del pipeline de CI están reservados para sus respectivas waves de gobernanza.

---

## 6. Prompt Canónico de Inicio para ChatGPT Web

Copie el siguiente prompt al iniciar una sesión de trabajo con ChatGPT Web:

```text
Estoy trabajando en el proyecto SolidBit Stable-Ecommerce (risejoaquin/stable-ecomerce).
Lee como punto de partida obligatorio:
1. 'ASSISTANT_START_HERE.md'
2. La gobernanza autoritativa en 'docs/engineering/' (GOV-ENG-001 a 007)
3. Las guías operativas en 'docs/team/' y el estado verificado en 'docs/team/LIVING_CONTEXT.md'

Recuerda los principios fundamentales:
- PROMPTS ARE EPHEMERAL: los contratos congelados y el repositorio son la única fuente de verdad.
- No reinventar el orquestador: el orquestador reside en un directorio externo.
- Diferenciar rigurosamente fases planeadas (mocks) vs fases verificadas (integración).
- Respetar la política GOV-DOC-001: cualquier cambio operativo debe incluir actualización documental en el mismo PR.

Mi rol es [JOAQUÍN / ROGELIO / JULIÁN], y estoy atendiendo el ticket [JIRA CCP-XX].
Por favor, analiza el estado actual y devuélveme un plan quirúrgico con:
- Alcance exacto (IN / OUT).
- Contratos congelados involucrados.
- Scripts de QA existentes a reutilizar.
- Matriz de riesgos y gates de salida.
- Bloque de evidencia determinista y declaración de DOC_IMPACT.

NO realices ni asumas autorización para git commit, push, merge, deploy, transiciones Jira ni escrituras en base de datos.
```
