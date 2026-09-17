CHECK: Supabase Live Database Schema, RLS and Security Inventory
AGENT: Codex
DATE/TIME: 2026-09-17T15:42:17-07:00
ENVIRONMENT: Supabase (`dporfgsbwsyqzmlnqrug`) via Railway `SUPABASE_DB_URL`
COMMIT SHA: c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640
COMMAND: railway run -- powershell -NoProfile -Command '$env:DATABASE_URL = $env:SUPABASE_DB_URL; .\scripts\qa\database\validate-database-security.ps1'
EXPECTED: Public tables, policies, and critical database functions inspected without destructive changes.
ACTUAL:
- Total public tables: 280 tables, all marked with `rowsecurity: true`.
- Total policies: 0 policies.
- Critical function inventory:
  1. `consume_coupon_after_payment`: `prosecdef: true`, EXECUTE granted to `=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres`, `search_path: ""` (empty).
  2. `decrement_stock`: `prosecdef: true`, EXECUTE granted to `=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres`, `search_path: ""` (empty).
  3. `finalize_paid_order`: `prosecdef: true`, EXECUTE granted to `=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres`, `search_path: ""` (empty).
  4. `restock_refunded_item`: NOT PRESENT in pg_proc.
- Full inventory output stored at `artifacts/qa/database-security-report.json`.
RESULT: PASS (Inventory captured; SEC-018 / SEC-019 verified)
EVIDENCE FILE: C:\Users\Lucilfer\Documents\Stable-Ecommerce\artifacts\qa\database-security-report.json
NOTES: Schema contains 280 tables representing uncurated/manual POST-LAUNCH migrations. Lack of migrations folder in repo and empty migration history prevents automated reproducibility.
