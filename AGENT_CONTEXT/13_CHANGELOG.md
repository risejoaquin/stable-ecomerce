# CHANGELOG

- 2026-09-17: QA/RELEASE E parallel execution package created.
- 2026-09-17: QA / RELEASE E completed all validation gates across Blocks A, B, and C. Remote baseline migration `20260918004527_remote_schema.sql` established and synchronized with Supabase CLI. SEC-005 login rate limiter implemented on `POST /api/login` and validated.
- 2026-09-17: QA / RELEASE E received ROADMAP PASS and is formally CLOSED.
- 2026-09-17: POST-LAUNCH 20 AUTHORIZED and ACTIVATED. Initiated PL20-01: Evidence-Driven Final Scale Assessment.
- 2026-09-18: POST-LAUNCH 20 (PL20-01 Hotfix): Aligned final scale assessment with real measured evidence. Corrected commercial query to use only existing production `orders` columns (removed non-existent `payment_status`), defined deterministic paid-like contract, derived net revenue and AOV with full evidence provenance, eliminated all arbitrary/heuristic scores, added `measured_state` to operating costs, enforced `finalScaleReady: false` when capacity and costs are unmeasured, isolated legacy seed rows, and implemented 12 permanent contract tests.
