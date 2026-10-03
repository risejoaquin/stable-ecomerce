# Preparación del Entorno Local — Stable-Ecommerce / SolidBit

**Estado:** Guía canónica y reproducible de instalación local.
**Autoridad:** Technical & Release Authority (`@risejoaquin`).
**Ámbito:** Ingenieros humanos, asistentes y agentes de desarrollo local.
**Regla de Oro:** Verificar siempre versiones vigentes en `package.json` y la configuración de CI (`.github/workflows/quality-gate.yml`) antes de alterar dependencias.

---

## 1. Matriz de Requisitos y Dependencias por Rol

Cada colaborador debe instalar únicamente las herramientas correspondientes a su dominio de responsabilidad:

| Herramienta | Rol Frontend / POS UI (`@Julian716`) | Rol Backend / DB (`@bonjourrog`) | Orquestación / Release (`@risejoaquin`) | Notas de Compatibilidad |
|---|---|---|---|---|
| **Git** | Sí (Obligatorio) | Sí (Obligatorio) | Sí (Obligatorio) | Git 2.40+ (Windows / Linux) |
| **GitHub CLI (`gh`)** | Sí (Obligatorio) | Sí (Obligatorio) | Sí (Obligatorio) | Autenticación interactiva vía navegador |
| **Node.js 22 LTS y npm 10+** | Sí (Obligatorio) | Sí (Obligatorio) | Sí (Obligatorio) | Versión congelada en CI (`node-version: 22`). Ver advertencia sobre Node 24. |
| **PowerShell 5.1 / pwsh 7+** | Sí (Obligatorio) | Sí (Obligatorio) | Sí (Obligatorio) | Windows PowerShell 5.1 nativo o PowerShell Core 7+. Ver sección 2. |
| **VS Code / IDE** | Recomendado | Recomendado | Recomendado | Extensiones: ESLint, Prettier, Tailwind CSS |
| **Antigravity CLI (`agy`)** | Opcional | Opcional | Sí (Obligatorio para waves) | Binario local del equipo. No adivinar flags. |
| **Railway CLI** | No autorizado | No autorizado | Solo Release Authority | Consultas de lectura autorizadas; autoDeploy=false |
| **Atlassian CLI (`acli`)** | Opcional (Jira) | Opcional (Jira) | Según autorización | Solo si la wave de Jira lo requiere |
| **PostgreSQL / Supabase CLI** | Mocks en Fase A | Local dev / Docker | Solo inspección | Credenciales de producción prohibidas en local |
| **Credenciales Stripe / Resend** | Mocks locales | Mocks / Staging keys | Custodia de secrets | Prohibido registrar tokens o claves live |

---

## 2. Enlaces Oficiales de Descarga

Descargue exclusivamente desde fuentes oficiales verificadas:

- **Git para Windows**: https://git-scm.com/downloads/win
- **GitHub CLI (`gh`)**: https://cli.github.com/
- **Node.js 22 LTS**: https://nodejs.org/en/download (Seleccionar rama **v22 LTS**)
- **PowerShell Core (`pwsh` 7+)**: https://learn.microsoft.com/powershell/scripting/install/installing-powershell
- **Visual Studio Code**: https://code.visualstudio.com/
- **Railway CLI**: https://docs.railway.com/guides/cli
- **Atlassian CLI**: https://developer.atlassian.com/cloud/jira/platform/
- **Antigravity CLI (`agy`)**: Utilizar el instalador distribuido formalmente por el equipo. Comprobar instalación con `agy --version` o `agy --help`.

---

## 3. Entornos de Shell: Windows PowerShell 5.1 vs PowerShell Core (`pwsh` 7+)

El repositorio convive con dos motores de PowerShell que presentan diferencias críticas de comportamiento:

### A. Windows PowerShell 5.1 (`powershell.exe`)
- **Presente en**: Máquinas Windows por defecto (e.g. host de Joaquín).
- **Scripts de `package.json`**:
  ```json
  "qa:fast": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/qa/validate-fast.ps1",
  "qa:release": "powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/qa/validate-release.ps1"
  ```
  Al invocar `powershell`, Windows ejecuta la versión 5.1.
- **Trampas conocidas de PS 5.1**:
  1. *Archivos vacíos*: `Get-Content -Raw` retorna `$null` en lugar de `""` ante archivos de 0 bytes (parcheado en `scan-local-secrets.ps1`).
  2. *Codificación UTF-8 con BOM*: `Set-Content -Encoding UTF8` en PS 5.1 añade un Byte Order Mark (BOM: `EF BB BF`), lo cual puede romper parsers de Node.js o herramientas de shell Unix.

### B. PowerShell Core 7+ (`pwsh`)
- **Presente en**: GitHub Actions runners (`shell: pwsh`), y entorno de Julián (v7.6.6).
- **Codificación**: UTF-8 sin BOM por defecto.
- **Resolución dinámica en scripts QA**:
  `scripts/qa/lib/qa-common.ps1` contiene `Get-QaPowerShellExecutable`, que detecta `pwsh` prioritariamente y si no existe retrocede a `powershell.exe`.

### C. Comandos equivalentes por entorno
| Tarea | Windows PowerShell 5.1 | PowerShell Core (`pwsh` 7+) |
|---|---|---|
| Ejecutar Fast Gate | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\qa\validate-fast.ps1` | `pwsh -NoProfile -File ./scripts/qa/validate-fast.ps1` |
| Validar secreto local | `powershell -ExecutionPolicy Bypass -File .\scripts\qa\security\scan-local-secrets.ps1` | `pwsh -File ./scripts/qa/security/scan-local-secrets.ps1` |
| Comprobar versión | `$PSVersionTable.PSVersion` | `$PSVersionTable.PSVersion` |

---

## 4. Instalación Limpia y Reproducible desde Checkout

Siga esta secuencia estricta para preparar un entorno reproducible sin contaminar el checkout principal:

```powershell
# 1. Definir la ruta del repositorio local (sustituir por su ruta real)
$Repo = 'C:\Users\Lucilfer\Documents\Stable-Ecommerce'
Set-Location $Repo

# 2. Diagnóstico no destructivo de Git
git status --short
git remote -v
git branch --show-current
git rev-parse HEAD

# 3. Comprobar versiones de entorno
node -v          # Debe ser v22.x LTS (o documentar discrepancia)
npm -v           # Debe ser 10+
git --version    # Debe ser 2.40+
$PSVersionTable.PSVersion

# 4. Instalación estricta de dependencias desde package-lock.json
# NUNCA ejecutar 'npm install' sin instrucción explícita.
npm ci

# 5. Verificación de compilación y tipos TypeScript
npm run lint

# 6. Ejecución de suite de pruebas unitarias
npm test

# 7. Verificación de build de producción (Vite frontend + esbuild server)
npm run build

# 8. Ejecución del Fast Gate de QA
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\qa\validate-fast.ps1
```

> [!WARNING]
> **Falla del script `npm run clean` en Windows**:
> El comando en `package.json` es `"clean": "rm -rf dist server.js"`. En Windows nativo (`cmd.exe`), `rm` no existe y el comando falla con código de salida 1.
> **Comando seguro en PowerShell para limpiar**:
> ```powershell
> Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, server.js
> ```

---

## 5. Gestión de Git Worktrees y `node_modules`

1. **Aislamiento de Worktrees**:
   Cuando el orquestador o un desarrollador crea un worktree nuevo (`git worktree add <ruta> <rama>`), **la carpeta `node_modules` NO se copia ni se comparte**.
2. **Requisito para Pruebas en Worktree**:
   - Agentes en modo solo lectura (`READ_ONLY`) o de documentación (`EDIT_DOCS`) no requieren `node_modules`.
   - Si un agente o desarrollador debe ejecutar builds o tests (`npm test`, `npm run build`, `npm run qa:fast`) dentro de un worktree, debe ejecutar un `npm ci` aislado dentro de dicho worktree.
   - **Prohibido**: Compartir `node_modules` mediante symlinks o junctions entre worktrees con agentes concurrentes, pues las escrituras simultáneas corrompen el árbol de paquetes.

---

## 6. Advertencia Crítica de Almacenamiento: Prohibición de OneDrive

> [!CAUTION]
> **RIESGO DE CORRUPCIÓN CON ONEDRIVE / SINCRONIZADORES EN LA NUBE**:
> - En sesiones previas se detectó que Julián utilizaba rutas dentro de OneDrive: `C:\Users\alex3\OneDrive\Documentos\stable-ecomerce`.
> - Los motores de sincronización en tiempo real (OneDrive, Dropbox, Google Drive, iCloud) bloquean descriptores de archivos durante operaciones I/O masivas (creación de `node_modules`, `git worktree add`, actualización de `.git/index.lock`).
> - Esto causa fallos intermitentes no deterministas: `EBUSY: resource busy or locked`, `EPERM: operation not permitted` y bloqueos fatales al limpiar worktrees.
> - **Directriz obligatoria**: Clonar repositorios de producto y del orquestador en discos locales no sincronizados (e.g. `C:\dev\stable-ecomerce` o `C:\Users\<Usuario>\Documents\Stable-Ecommerce` fuera de OneDrive).

---

## 7. Gestión de Secretos, Variables de Entorno y Prevención de Fugas

### A. Diferenciación entre Capacidades CLI y Credenciales
- Para verificar acceso a herramientas CLI, **nunca ingrese ni imprima tokens en terminal o chat**.
- Utilice siempre comandos de introspección no destructivos:
  ```powershell
  # Comprobar GitHub CLI sin revelar tokens
  gh auth status

  # Comprobar Railway CLI sin revelar credenciales
  railway whoami

  # Comprobar presencia de Antigravity CLI
  Get-Command agy -ErrorAction SilentlyContinue | Select-Object Source
  ```

### B. Mapeo de Variables de Entorno: `DATABASE_URL` vs `SUPABASE_DB_URL`
- `.env.example` incluye `SUPABASE_DB_URL=postgresql://...`.
- Sin embargo, los scripts de seguridad (`scripts/qa/database/validate-database-security.ps1` y `check-database-security.mjs`) exigen la variable **`DATABASE_URL`**.
- Al configurar el archivo `.env` local para pruebas de base de datos, defina:
  ```env
  DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
  ```

### C. Variables de Entorno Activas del Servidor (`server.ts`)
Asegúrese de configurar adecuadamente (mediante valores mock o de desarrollo local):
- `PORT` (por defecto 3000)
- `LOG_LEVEL` (e.g. `info`, `debug`, `silent` para tests)
- `ALLOWED_ORIGINS` (orígenes CORS permitidos)
- `SUPABASE_URL` y `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (estrictamente servidor)
- `PRIMARY_STORE_SLUG`
- `EMAIL_ALLOW_MOCKS=true` (para evitar envíos reales en local)

### D. Regla Inquebrantable de Seguridad: Prefijo `VITE_`
> [!IMPORTANT]
> En Vite, cualquier variable de entorno con prefijo `VITE_` (e.g. `VITE_SUPABASE_ANON_KEY`) se compila e inyecta directamente dentro del bundle JavaScript público enviado a los navegadores de los clientes.
> **BAJO NINGUNA CIRCUNSTANCIA** anteponga el prefijo `VITE_` a secretos de backend:
> - NUNCA: `VITE_SUPABASE_SERVICE_ROLE_KEY`
> - NUNCA: `VITE_STRIPE_SECRET_KEY`
> - NUNCA: `VITE_RESEND_API_KEY`
> - NUNCA: `VITE_DATABASE_URL`

---

## 8. Evidencia Mínima de Onboarding Exitoso

Para dar por concluido el onboarding local de un ingeniero, se debe registrar y verificar:
1. Versión exacta de Node.js, npm, Git y PowerShell capturada en terminal.
2. `git status --short` limpio en rama tracking `origin/main`.
3. `npm ci` ejecutado con código de salida `0`.
4. `npm run lint` finalizado con `0 errors, 0 warnings`.
5. `npm test` ejecutado con todas las suites unitarias pasando limpiamente.
6. `npm run build` produciendo el directorio `dist/` y `server.js` sin errores.
7. `validate-fast.ps1` emitiendo `FINAL RESULT: PASS`.
