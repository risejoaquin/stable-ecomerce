# Database scripts

Run `001_selfcare_sinners_production_schema.sql` on a clean Supabase database, or after backing up production.

The user confirmed the current DB has no important data, so the schema can be recreated if needed.

Recommended production order:

1. Backup Supabase project.
2. Run schema in Supabase SQL editor.
3. Create or update admin user with `role='admin'` and email equal to `ADMIN_EMAIL`.
4. Confirm primary store slug: `selfcare-sinners`.
5. Deploy Railway.
6. Test `/api/health`.
