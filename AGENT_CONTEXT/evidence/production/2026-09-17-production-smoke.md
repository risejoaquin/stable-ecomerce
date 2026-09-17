CHECK: Production Non-Destructive Smoke Validation
AGENT: Codex
DATE/TIME: 2026-09-17T15:40:05-07:00
ENVIRONMENT: Production (`https://selfcaresinners.com`)
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: .\scripts\qa\validate-production.ps1 -BaseUrl "https://selfcaresinners.com" -ExpectedCommit "c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640"
EXPECTED: All public routes return 200, deployed commit matches, unauthorized admin boundary returns 401, security headers present.
ACTUAL:
- PASS route / -> 200
- PASS route /faq -> 200
- PASS route /privacy -> 200
- PASS route /returns -> 200
- PASS route /terms -> 200
- PASS route /track -> 200
- PASS health status -> ok
- PASS deployed commit -> c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
- PASS admin diagnostics unauthorized boundary -> 401
- PASS Content-Security-Policy present
- PASS X-Content-Type-Options present
- PASS production non-destructive smoke
RESULT: PASS
EVIDENCE FILE: AGENT_CONTEXT/evidence/production/2026-09-17-production-smoke.md
NOTES: Production verified as fully operational on commit c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640 following SEC-P1-001 legacy upload hardening.
