# Hotfix PL07.1 — Catalog validate-import route

Fixes production route compatibility for `POST /api/admin/catalog/validate-import`.

## Reason

The PL07 DB migration and GET endpoints were valid, but production returned `Cannot POST /api/admin/catalog/validate-import`.

## Change

Registers a defensive admin route for catalog import validation before the older catalog route block. The response includes `source=hotfix_pl07_1_catalog_validate_import_route` for verification.

## Validation

Run:

```powershell
.\scripts\qa\smoke-catalog-sales.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

Expected: `PASS Catalog validate import -> 200`.
