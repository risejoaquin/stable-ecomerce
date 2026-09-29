# Database Scripts & Historical Migration Archive

> [!CAUTION]
> **HISTORICAL REFERENCE ONLY — DO NOT EXECUTE ON PRODUCTION.**
> The production database is actively serving traffic with persistent customer and commerce data. The schema must **never** be dropped or recreated. Production database schema synchronization is managed strictly via `supabase/migrations/` and the Supabase CLI.

---

## 1. Overview & Operational Policy

The SQL files in this directory (`scripts/db/001_...` through `scripts/db/043_...`) represent historical migration snapshots and phase patches executed during platform development. They are maintained under zero-deletion governance for architectural provenance and reference only.

- **Do NOT** execute `001_selfcare_sinners_production_schema.sql` on an active environment.
- **Do NOT** apply manual schema changes directly without Supabase migration tracking.
- All new database schema changes must be authored as versioned migrations in `supabase/migrations/`.

---

## 2. Historical Script Catalog

| Script | Purpose / Scope |
| :--- | :--- |
| `001_selfcare_sinners_production_schema.sql` | Initial baseline schema snapshot (Historical reference only) |
| `002_payment_order_integrity.sql` | Stripe payment verification & order state integrity |
| `003_webhook_finalization_resilience.sql` | Webhook idempotent finalization & restock procedures |
| `004_ecommerce_operations_admin_hardening.sql` | Admin operations & order lifecycle controls |
| `005_storefront_customer_experience_and_timeline.sql` | Storefront tracking URLs and `order_timeline` trigger |
| `006_seo_performance_accessibility_polish.sql` | SEO metadata and catalog optimizations |
| `007_devops_observability_qa_launch_readiness.sql` | Diagnostic views and readiness queries |
| `008_post_launch_commercial_growth_readiness.sql` through `043_email_production_c_admin_center_templates.sql` | Incremental phase features, post-launch extensions, and email queue contracts |

---

## 3. Production Database Verification

To verify the database structure without applying destructive changes, use the automated read-only validators:

```powershell
# Validate database security controls and function privileges
.\scripts\qa\database\validate-database-security.ps1

# Check Supabase integrity and required tables
.\scripts\qa\check-supabase-integrity.sql
```
