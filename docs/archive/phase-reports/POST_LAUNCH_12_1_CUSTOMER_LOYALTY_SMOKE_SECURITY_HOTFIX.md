# POST-LAUNCH 12.1 — Customer Loyalty Smoke Security Hotfix

## Status

Hotfix prepared for PL12 customer loyalty validation.

## Problem detected

The smoke script attempted to validate customer-owned endpoints such as:

- `GET /api/customer/profile/advanced?email=...`
- `PUT /api/customer/preferences`
- `GET /api/customer/loyalty`
- `GET /api/customer/wallet`
- `GET /api/customer/subscriptions`

without a real customer bearer token.

Production correctly returned:

```txt
401 Unauthorized
```

## Technical decision

Do not weaken `/api/customer/*` security to make a smoke test pass.

Customer-owned endpoints must be validated only with a real customer session/token. Admin validation must use the admin `customer-experience` surface.

## Change

Updated:

```txt
scripts/qa/smoke-customer-loyalty.ps1
```

The script now validates admin/customer-experience endpoints by default:

- `GET /api/admin/customer-experience/summary`
- `GET /api/admin/customer-experience/customers`
- `GET /api/admin/customer-experience/segments`
- `GET /api/admin/customer-experience/loyalty`
- `GET /api/admin/customer-experience/subscriptions`
- `GET /api/admin/customer-experience/personalization`
- `POST /api/admin/customer-experience/segments`
- `POST /api/admin/customer-experience/loyalty/adjust`
- `POST /api/admin/customer-experience/customer-notification`
- `GET /api/admin/diagnostics`

Optional customer endpoint validation is available only when explicitly passing:

```powershell
-IncludeCustomerEndpoints -CustomerToken "CUSTOMER_BEARER_TOKEN"
```

## Default validation command

```powershell
Unblock-File .\scripts\qa\smoke-customer-loyalty.ps1

.\scripts\qa\smoke-customer-loyalty.ps1 `
  -BaseUrl "https://selfcaresinners.com" `
  -Email "TU_ADMIN_EMAIL" `
  -Password "TU_PASSWORD"
```

## Expected result

```txt
PASS Admin customer summary -> 200
PASS Admin customers -> 200
PASS Admin segments -> 200
PASS Admin loyalty -> 200
PASS Admin subscriptions -> 200
PASS Admin personalization -> 200
PASS Create segment -> 200
PASS Adjust loyalty -> 200
PASS Customer notification -> 200
PASS Admin diagnostics -> 200
PASS customer loyalty admin smoke checks
```
