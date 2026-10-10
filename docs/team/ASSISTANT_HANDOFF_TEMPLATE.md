# Plantilla Canónica de Traspaso (Handoff) — ChatGPT Web / Antigravity CLI

**Propósito:** Transferencia estandarizada de contexto operativo entre sesiones, desarrolladores y agentes de IA.
**Instrucciones:** Copiar el bloque inferior y completarlo exhaustivamente al finalizar una sesión o wave. Remitir siempre a la entrada principal `ASSISTANT_START_HERE.md`.

---

```markdown
# PAQUETE DE TRASPASO DE CONTEXTO (HANDOFF)

## 1. Identidad y Alcance
- **Proyecto**: SolidBit Stable-Ecommerce (`risejoaquin/stable-ecomerce`)
- **Responsable / Rol**: [Joaquín (@risejoaquin) | Rogelio (@bonjourrog) | Julián (@Julian716)]
- **Ticket Jira**: [e.g. CCP-43, CCP-40]
- **Fase del Ticket**: [Fase A (Mocks) | Fase B (Integración Real) | etc.]
- **Objetivo Concreto**: [Descripción concisa del cambio realizado o planificado]
- **Alcance IN**: [Archivos y componentes autorizados para edición]
- **Alcance OUT**: [Archivos congelados o expresamente prohibidos en la wave]

## 2. Estado Confirmado en Vivo (Cero Suposiciones)
- **Repositorio y Ruta Local**: [Ruta verificada fuera de OneDrive]
- **Rama Actual y Worktree**: [Rama de trabajo y ruta del worktree aislado]
- **Base SHA (origin/main)**: [SHA obtenido de `git rev-parse origin/main`]
- **Estado de Trabajo (`git status --short`)**: [Salida de git status]
- **Estado en Jira**: [En curso, Listo, Bloqueado] + Fecha de última consulta
- **Último PR / Checks de CI**: [Número de PR y estado de quality-gate.yml]
- **Entorno Evaluado**: [Local aislado | Staging | Producción (No Aplica)]

## 3. Orquestador y Evidencia Cruda
- **Directorio del Orquestador**: [Directorio externo, e.g. Stable-Ecommerce-Orchestrator]
- **ID de Wave / Run**: [e.g. doc-gov-20261001-233633-6762c9]
- **Agentes Lanzados**: [Nombres de agentes, modos READ_ONLY / WRITE, PIDs]
- **Comandos Ejecutados**: [Lista exacta con código de salida (exit code)]
- **Rutas de Reportes Externos**: [Rutas de REPORT.md y SUMMARY.md fuera del repo]
- **QA Independiente**: [Resultado de `validate-fast.ps1` o suites específicas]
- **Bloqueos Reales Detectados**: [Errores crudos, stack traces o permisos faltantes]

## 4. Matriz de Autorizaciones
- **Acciones Permitidas en la Wave**: [e.g. Edición en docs/team/, lectura en repo]
- **Acciones Estrictamente Prohibidas**: [No commit, no push, no merge, no deploy, no mutación Jira/DB]
- **Custodia de Secretos**: [Confirmación de CERO tokens, claves o contraseñas expuestas]

## 5. Declaración de Impacto Documental (Política GOV-DOC-001)
- **Impacto en Entorno (SETUP)**: [SÍ / NO]
- **Impacto en Workflow Diario (WORKFLOW)**: [SÍ / NO]
- **Archivos Documentales Actualizados**: [Lista de rutas en docs/team/, DECISION_LOG.md, LIVING_CONTEXT.md]
- **Exención DOC_IMPACT=NONE**: [NO APLICA | SÍ con justificación formal: `[NO_DOC_IMPACT: <justificación mínima de 15 caracteres>]`]
- **Acción Documental Pendiente**: [Descripción de seguimiento o NINGUNA]

## 6. Próximo Gate y Responsable
- **Siguiente Acción**: [e.g. Revisión humana, apertura de PR, ejecución de QA]
- **Criterio de Aceptación (PASS/BLOCKED)**: [Definición verificable con evidencia]
- **Autoridad Responsable**: [Nombre y mención del codeowner que aprueba]
```
