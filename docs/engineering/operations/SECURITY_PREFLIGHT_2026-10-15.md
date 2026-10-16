# Audit C-01/C-04 — Read-only schema preflight

**Status:** REVIEW REQUIRED; diagnostics only; nothing executed against a database by this PR.

## Purpose

Prepare a controlled baseline of effective anonymous/authenticated table privileges, RLS activation, privileged `SECURITY DEFINER` callable exposure, hardened `search_path`, and aggregate `sellable_units` mapping/stock discrepancies.

The report does not prove exposure through an actual Supabase API deployment; schema exposure, privileges, policies, inherited roles, and per-role runtime behavior must also be validated. It does not alter anything.

## Safe invocation

1. Use only a specifically approved **local or staging** Postgres database. Obtain an appropriately scoped **read-only** database user (not service_role credentials).
2. Set `CCP_AUDIT_READONLY_DATABASE_URL` for this run only. **Do not use `DATABASE_URL` or production secrets**.
3. Execute in the repo root:

```powershell
$env:CCP_AUDIT_READONLY_DATABASE_URL = "<LOCAL_OR_STAGING_READONLY_POSTGRES_URL>"
node .\scripts\qa\database\audit-readonly-schema.mjs --include-inventory --strict
Remove-Item Env:\CCP_AUDIT_READONLY_DATABASE_URL
```

SQL transactions always start with `BEGIN READ ONLY`, with a statement timeout and rollback. A strict exit code of 1 indicates possible risks; 2 indicates preflight could not complete; 0 indicates no risks under the limited checks.

**Never paste credentials or raw output containing environment variables into Jira or GitHub.** This tool produces table/function names and inventory aggregate counts only.

## Remediation gate

- Investigate public tables without RLS where `anon` or `authenticated` has effective privileges.
- Review each critical privileged function for effective callable exposure, expected roles, idempotency and SQL object resolution.
- Ensure no unreviewed `SECURITY DEFINER` function omits hardened `search_path`.
- Investigate zero-unit products and stock mismatches; do not silently rewrite existing inventory rows.
- Require local concurrency and refund tests (CCP-12 / CCP-13) and human approval before any corrective migration.
- Do not merge audit-provided `044`; it conflicts with `DR-INV-001` and the frozen contracts.
