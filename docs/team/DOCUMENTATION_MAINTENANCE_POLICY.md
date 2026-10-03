# GOV-DOC-001 — Política de Mantenimiento y Continuidad Documental Obligatoria

**Identificador de Política:** `GOV-DOC-001`
**Estado:** **DECIDED / ENFORCED** (según decisión `D-2026-10-01-05`).
**Autoridad de Aplicación:** Technical & Release Authority (`@risejoaquin`).
**Ámbito de Cumplimiento:** Todos los ingenieros humanos, asistentes conversacionales (ChatGPT Web) y agentes autónomos (Antigravity CLI).

---

## 1. Principio y Regla de Cierre (Definition of Done)

> **EL CÓDIGO NO ESTÁ COMPLETO HASTA QUE EL CONTEXTO OPERATIVO ESTÉ SINCRONIZADO EN EL MISMO PR.**

Ningún cambio técnico, ajuste de infraestructura, modificación de dependencias, alteración de scripts de QA o decisión arquitectónica se considera **Done** ni apto para merge hasta que el **mismo Pull Request** contenga las actualizaciones documentales correspondientes en `docs/team/`.

### Requisitos Mandatorios de Sincronización en el Mismo PR:
1. **`docs/team/DECISION_LOG.md`**: Obligatorio siempre que se tome una decisión técnica, cambio de configuración o actualización de políticas. Debe incluir ID estructurado (`D-YYYY-MM-DD-NN`), fecha, decisión, estado (`PROPOSED`, `ACCEPTED`, `DECIDED`, `SUPERSEDED`), responsable y evidencia.
2. **`docs/team/LIVING_CONTEXT.md`**: Obligatorio siempre que cambie el estado operativo verificado del proyecto (SHAs base, estado de ramas, resultados de auditorías, vulnerabilidades, estado de Railway o Jira).
3. **`docs/team/LOCAL_ENVIRONMENT_SETUP.md`**: Obligatorio **SI** el cambio altera la instalación, versiones mínimas de Node/npm/PowerShell, herramientas CLI requeridas, variables de entorno en `.env.example`, o preparación del entorno local.
4. **`docs/team/LOCAL_ENGINEERING_WORKFLOW.md`**: Obligatorio **SI** el cambio modifica el ciclo diario, orquestación, gestión de worktrees, ejecución de QA, gates de CI, revisiones de pares, o procedimientos de release/despliegue.
5. **`docs/team/KNOWN_DOCUMENTATION_DRIFT.md`**: Obligatorio **SI** se detecta una discrepancia o contradicción no resuelta entre documentos de ingeniería y la realidad del sistema.

---

## 2. Matriz Automatizada de Disparadores y Requisitos

El gate automatizado de CI (`TEST-DOC-IMPACT.ps1`) inspecciona las rutas modificadas en el PR y exige los documentos asociados:

| Dominio de Cambio | Rutas de Código / Configuración Modificadas | Documentación Exigida en el Mismo PR |
|---|---|---|
| **SETUP / Dependencias / Tooling** | `package.json`, `package-lock.json`, `.nvmrc`, `.npmrc`, `.node-version`, `Dockerfile*`, `docker-compose*`, `.env.example`, `tsconfig*.json`, `vite.config.*`, `vitest.config.*`, `playwright.config.*` | `LOCAL_ENVIRONMENT_SETUP.md` + `DECISION_LOG.md` + `LIVING_CONTEXT.md` |
| **WORKFLOW / Gobernanza / QA** | `AGENTS.md`, `CONTRIBUTING.md`, `ASSISTANT_START_HERE.md`, `scripts/qa/`, `scripts/governance/`, `.github/workflows/`, `.github/CODEOWNERS`, `docs/engineering/TEAM_DEVELOPMENT_WORKFLOW.md`, `docs/engineering/SHARED_OWNERSHIP_RULES.md` | `LOCAL_ENGINEERING_WORKFLOW.md` + `DECISION_LOG.md` + `LIVING_CONTEXT.md` |
| **DATABASE / Schemas / Backend** | `supabase/migrations/`, `scripts/db/`, `server.ts`, `src/server/` | `DECISION_LOG.md` + `LIVING_CONTEXT.md` |
| **DOCUMENTACIÓN DE EQUIPO** | `docs/team/LOCAL_ENVIRONMENT_SETUP.md`, `docs/team/LOCAL_ENGINEERING_WORKFLOW.md`, `docs/team/DOCUMENTATION_MAINTENANCE_POLICY.md` | `DECISION_LOG.md` + `LIVING_CONTEXT.md` |

---

## 3. Protocolo para Decisiones Externas a Git (Evitar la Deriva Silenciosa)

Muchos cambios operativos ocurren **fuera del repositorio Git**:
- Decisiones en conversaciones de ChatGPT Web.
- Cambios de estado o dependencias en tickets de Jira.
- Desactivación de flags o ajustes en la consola de Railway (e.g. `autoDeploy=false`).
- Actualizaciones a scripts en el repositorio externo del orquestador (`Stable-Ecommerce-Orchestrator`).

> [!CAUTION]
> **OBLIGACIÓN DE PR DOCUMENTAL DEDICADO**:
> Debido a que las acciones externas no generan commits automáticos en Git, el gate de CI no se activará de forma reactiva.
> **Regla**: El responsable de una decisión u operación externa está obligado a abrir inmediatamente un **Pull Request puramente documental** en `risejoaquin/stable-ecomerce` que registre el hecho en `docs/team/LIVING_CONTEXT.md` y `docs/team/DECISION_LOG.md`.
> Nunca asuma que una decisión externa "se sincronizará automáticamente".

---

## 4. Estándar Antifraude y Verificación de Contenido

Para evitar "Falsos PASS" por cumplimiento meramente formal, la gobernanza impone las siguientes salvaguardas:

1. **Prohibición de Documentos Vacíos o Stubs Triviales**:
   - Todo archivo documental requerido debe existir físicamente y contener contenido estructurado sustantivo (tamaño mínimo $> 100$ bytes).
   - No se admiten diffs donde solo se inserten espacios en blanco, comentarios vacíos o saltos de línea.
2. **Validación Estructural y de Formato del Diff (Sin Afirmar Validación Semántica Automática)**:
   - El gate automatizado `TEST-DOC-IMPACT.ps1` comprueba la estructura sintáctica: IDs con formato formal (`D-YYYY-MM-DD-NN`), fechas válidas y estados permitidos (`PROPOSED`, `ACCEPTED`, `DECIDED`, `SUPERSEDED`, `IMPLEMENTED_LOCAL`, `PROD_VERIFIED`), así como presencia de fechas o tickets en `LIVING_CONTEXT.md`.
   - **Aviso de Limitación Técnica**: La validación semántica de fondo (corrección técnica, sensatez arquitectónica y exactitud del razonamiento) **NO es validada automáticamente por CI**. Los scripts validan higiene estructural y antifraude; el análisis semántico y la aprobación final recaen ineludiblemente sobre la revisión humana de codeowners (`@risejoaquin`) antes del merge.
3. **Prohibición de Documentación Ficticia**:
   - Está prohibido inventar enlaces de Jira, números de PR, fechas de despliegue o resultados de pruebas que no hayan ocurrido.
   - Recordar que los modelos de lenguaje o asistentes no siempre poseen acceso de lectura directo al repositorio local; por tanto, los documentos deben ser autosuficientes, concisos y rigurosamente indexados.

---

## 5. Procedimiento Formal de Exención (`DOC_IMPACT=NONE`)

En casos excepcionales donde un cambio toque rutas monitoreadas por razones meramente cosméticas (e.g. corrección de un error tipográfico en un script auxiliar de QA sin alteración funcional del workflow ni del entorno):

### Sintaxis Requerida:
El autor debe incluir en el mensaje de commit (`git commit -m "..."`) o en el cuerpo de la descripción del Pull Request la siguiente etiqueta exacta:

```text
[NO_DOC_IMPACT: <Justificación técnica detallada de mínimo 15 caracteres>]
```

### Reglas de Exención:
- **Justificaciones inválidas**: Textos genéricos como `"none"`, `"n/a"`, `"no doc impact"`, `"fix typo"` o justificaciones menores a 15 caracteres serán **rechazadas por el gate de CI** con código de salida `2` (`FAIL_INVALID_JUSTIFICATION`).
- **Justificación válida**: Ejemplo: `[NO_DOC_IMPACT: Correccion ortografica en log de scan-local-secrets sin alterar comportamiento]`.
- La exención debe ser ratificada formalmente por el revisor del código durante la revisión de pares.

---

## 6. Obligaciones para Asistentes Conversacionales y Agentes Autónomos

Todo asistente (ChatGPT Web) y agente ejecutor (Antigravity CLI) debe cumplir las siguientes pautas:

1. **Lectura Previa**: Leer `ASSISTANT_START_HERE.md` y `docs/team/LIVING_CONTEXT.md` antes de proponer cambios de código.
2. **Declaración en Reporte Final**: Todo informe final (`REPORT.md`) emitido por un agente debe contener obligatoriamente el siguiente bloque estructurado:
   ```markdown
   ## Declaración de Impacto Documental (DOC_IMPACT)
   - **Impacto en Entorno (SETUP)**: SÍ / NO (especificar cambios en dependencias o herramientas)
   - **Impacto en Flujo (WORKFLOW)**: SÍ / NO (especificar cambios operativos)
   - **Archivos Documentales Modificados**: [Lista de rutas en docs/team/ o ASSISTANT_START_HERE.md]
   - **Exención DOC_IMPACT=NONE**: [SÍ con justificación / NO APLICA]
   - **Acción Documental Pendiente**: [Descripción o NINGUNA]
   ```
3. **No Afirmar PASS sin Pruebas**: Prohibido asumir que una suite pasó solo porque no se imprimieron errores. Se debe reportar el código de salida exacto ($0$) y la salida relevante.
