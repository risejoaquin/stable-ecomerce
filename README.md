# Selfcare Sinners — Client Commerce Platform

Production e-commerce platform powering the Selfcare Sinners brand, built with a modern single-merchant monolith architecture deployed on Railway.

---

## 1. Quick Start & Development

### Prerequisites
- **Node.js**: v22.x LTS (Recommended)
- **Package Manager**: npm 10+
- **Shell**: PowerShell 7+ / Windows Terminal (for QA scripts)

### Installation
```powershell
# Install locked dependencies
npm ci
```

### Local Development Scripts
*All scripts correspond directly to definitions in `package.json`:*

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts local development server via `tsx server.ts` |
| `npm run build` | Compiles client via Vite and bundles server via esbuild to `dist/server.cjs` |
| `npm start` | Executes production CommonJS server bundle (`node dist/server.cjs`) |
| `npm run preview` | Previews static client production build via Vite |
| `npm run clean` | Cleans previous build artifacts (`dist/`, `server.js`) |

---

## 2. Quality Gates & Testing

Before opening a Pull Request or pushing changes, run the local quality verification suite:

```powershell
# 1. Typecheck: TypeScript compilation without emitting output
npm run lint

# 2. Unit & Integration Tests: Run Vitest test runner
npm test

# 3. Production Build: Bundle client and server
npm run build

# 4. Fast Local Quality Gate: PowerShell automated pre-push validation
npm run qa:fast
```

### Extended Quality Suites
```powershell
# Full release candidate validation (security baseline, regression contracts, build)
npm run qa:release

# End-to-end customer journey testing (requires server running)
npm run test:e2e

# Targeted security baseline audit
npm run qa:security
```

---

## 3. Technology Stack & Architecture

- **Frontend Tier**: React 19.0.1, Vite 6.2.3, Tailwind CSS v4, Motion, Lucide Icons, TanStack Query v5, Zustand.
- **Backend Tier**: Node.js 22 LTS, Express 4.21.2 (`server.ts` bundled with esbuild to `dist/server.cjs`), Helmet, CORS, Pino logging, Sentry error monitoring.
- **Database & Storage**: Managed PostgreSQL on Supabase Cloud with Row Level Security (RLS) policies and Supabase Storage buckets.
- **Payment Processing**: Stripe Checkout Sessions and cryptographically verified webhooks (`STRIPE_WEBHOOK_SECRET`).
- **Transactional Email**: Resend API integration with local database queue (`email_queue`) and asynchronous background worker.
- **Hosting & Infrastructure**: Single container process on Railway (`heroic-solace`) serving static assets and API routes at `https://selfcaresinners.com`.

For full technical specifications and architectural boundaries, see [**`ARCHITECTURE.md`**](ARCHITECTURE.md).

---

## 4. Repository Information Architecture & Governance

The repository enforces strict enterprise governance standards across all contributions:

| Resource | Scope |
| :--- | :--- |
| [**`ARCHITECTURE.md`**](ARCHITECTURE.md) | Technical architecture, runtime components, and CURRENT / PLANNED / FUTURE boundaries. |
| [**`CONTRIBUTING.md`**](CONTRIBUTING.md) | 10-step development lifecycle, branching strategy, and PR submission rules. |
| [**`SECURITY.md`**](SECURITY.md) | Responsible disclosure policy, reporting process, and active security controls. |
| [**`CHANGELOG.md`**](CHANGELOG.md) | Keep a Changelog 1.1 records of milestones, security fixes, and releases. |
| [**`.github/CODEOWNERS`**](.github/CODEOWNERS) | Path-based code ownership and review assignments across the 3-person team. |
| [**`AGENTS.md`**](AGENTS.md) | Agent execution protocol, responsibilities, and operating rules. |
| [**`docs/README.md`**](docs/README.md) | Canonical documentation table of contents and domain directory index. |

---

## 5. Historical Context & Archive

Historical development phases, previous macrofase hotfix records (EMERGENCY-DRY, UIX, PERFORMANCE, QA/RELEASE E), and legacy smoke test scripts have been permanently preserved under zero-deletion governance:

- **Historical Project Reports**: [`docs/release/FINAL_PROJECT_STATUS_REPORT.md`](docs/release/FINAL_PROJECT_STATUS_REPORT.md)
- **Documentation Archive**: [`docs/archive/`](docs/archive/)
- **Commercial Requirements Archive**: [`docs/commercial/`](docs/commercial/)
- **QA Automation & Diagnostics**: [`scripts/archive/`](scripts/archive/) and [`scripts/diagnostics/`](scripts/diagnostics/)
