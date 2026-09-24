# POST-LAUNCH 07 — Real Catalog Import, Merchandising & Sales Enablement

## Goal
Move from infrastructure-ready commerce to a real sellable catalog workflow.

## Scope
- Real catalog import template.
- CSV/API catalog validation before publishing.
- Bulk import with import batch tracking.
- Product QA scoring.
- Merchandising rules.
- Product media asset management.
- Featured products, promo badges, margins and stock readiness.
- Public merchandising home payload.
- Sales enablement readiness for first real campaigns.

## Required migration
Run:

```sql
scripts/db/013_post_launch_07_real_catalog_merchandising_sales_enablement.sql
```

Then:

```sql
NOTIFY pgrst, 'reload schema';
```

## Smoke test

```powershell
Unblock-File .\scripts\qa\smoke-catalog-sales.ps1

.\scripts\qa\smoke-catalog-sales.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Acceptance criteria
- DB migration passes.
- Catalog import tables exist.
- Product commercial/merchandising columns exist.
- Public merchandising home returns 200.
- Admin catalog QA returns 200.
- Admin import template returns 200.
- Admin merchandising summary returns 200.
- Catalog validation returns 200.
- Merchandising rule upsert returns 200.
