/**
 * Controlled C-01/C-04 schema preflight. NEVER writes to any database.
 *
 * Usage (authorized LOCAL/STAGING read-only account ONLY):
 *   CCP_AUDIT_READONLY_DATABASE_URL='postgres://...' node scripts/qa/database/audit-readonly-schema.mjs --include-inventory --strict
 *
 * There is no fallback to DATABASE_URL / SUPABASE_DB_URL to avoid accidental
 * inspection of a different environment. No secrets or row-level PII printed.
 */
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.CCP_AUDIT_READONLY_DATABASE_URL;
if (!connectionString) {
  console.error('CCP_AUDIT_READONLY_DATABASE_URL must be set explicitly to a permitted LOCAL/STAGING read-only account.');
  process.exit(2);
}

const includeInventory = process.argv.includes('--include-inventory');
const strict = process.argv.includes('--strict');
const criticalFunctions = new Set([
  'finalize_paid_order',
  'restock_refunded_order',
  'restock_refunded_item',
  'decrement_stock',
  'decrement_sellable_unit_stock',
  'restock_sellable_unit',
  'claim_email_queue_for_delivery',
  'claim_abandoned_carts_for_recovery'
]);

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
  application_name: 'stable_ecommerce_audit_readonly'
});

try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '10s'");

  const tables = (await client.query(`
    SELECT n.nspname AS schema_name,
           c.relname AS table_name,
           c.relrowsecurity AS rls_enabled,
           has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
           has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
           has_table_privilege('anon', c.oid, 'UPDATE') AS anon_update,
           has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete,
           has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
           has_table_privilege('authenticated', c.oid, 'INSERT') AS authenticated_insert,
           has_table_privilege('authenticated', c.oid, 'UPDATE') AS authenticated_update,
           has_table_privilege('authenticated', c.oid, 'DELETE') AS authenticated_delete
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  `)).rows;

  const functions = (await client.query(`
    SELECT p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS arguments,
           p.prosecdef AS security_definer,
           COALESCE(array_to_string(p.proconfig, ','), '') AS settings,
           has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
    ORDER BY p.proname
  `)).rows;

  const exposedWithoutRls = tables.filter((table) =>
    !table.rls_enabled && (
      table.anon_select || table.anon_insert || table.anon_update || table.anon_delete ||
      table.authenticated_select || table.authenticated_insert ||
      table.authenticated_update || table.authenticated_delete
    )
  ).map((table) => table.table_name);

  const privilegedFunctionsExposed = functions.filter((fn) =>
    criticalFunctions.has(fn.function_name) && fn.security_definer &&
    (fn.anon_execute || fn.authenticated_execute)
  ).map((fn) => ({ name: fn.function_name, args: fn.arguments, anon: fn.anon_execute, authenticated: fn.authenticated_execute }));

  const definerWithoutSearchPath = functions.filter((fn) =>
    fn.security_definer && !/(^|,)search_path\s*=/.test(fn.settings)
  ).map((fn) => ({ name: fn.function_name, args: fn.arguments }));

  const inventory = { status: includeInventory ? 'NOT_AVAILABLE' : 'NOT_REQUESTED' };
  if (includeInventory) {
    const presence = (await client.query(`
      SELECT to_regclass('public.products') IS NOT NULL AS has_products,
             to_regclass('public.sellable_units') IS NOT NULL AS has_sellable_units
    `)).rows[0];
    if (presence.has_products && presence.has_sellable_units) {
      const counts = (await client.query(`
        WITH per_product AS (
          SELECT product_id, SUM(stock)::BIGINT AS unit_stock
          FROM public.sellable_units
          GROUP BY product_id
        )
        SELECT COUNT(*) FILTER (WHERE s.product_id IS NULL)::BIGINT AS unmapped_products,
               COUNT(*) FILTER (WHERE s.product_id IS NOT NULL AND p.stock::BIGINT <> s.unit_stock)::BIGINT AS stock_discrepancies
        FROM public.products p
        LEFT JOIN per_product s ON s.product_id = p.id
      `)).rows[0];
      inventory.status = 'MEASURED';
      inventory.unmappedProducts = Number(counts.unmapped_products);
      inventory.stockDiscrepancies = Number(counts.stock_discrepancies);
    }
  }

  const report = {
    mode: 'READ_ONLY',
    scope: 'public tables, executable routines and optional aggregate inventory counts',
    counts: {
      publicTables: tables.length,
      tablesWithoutRls: tables.filter((table) => !table.rls_enabled).length,
      publicFunctions: functions.length
    },
    risks: { exposedWithoutRls, privilegedFunctionsExposed, definerWithoutSearchPath },
    inventory,
    verification: 'Catalog metadata only; real PostgREST exposure and per-role RLS tests require separate validation.'
  };

  console.log(JSON.stringify(report, null, 2));
  const hasRisk = exposedWithoutRls.length > 0 || privilegedFunctionsExposed.length > 0 ||
    definerWithoutSearchPath.length > 0 ||
    (includeInventory && inventory.status !== 'MEASURED') ||
    (includeInventory && (inventory.unmappedProducts > 0 || inventory.stockDiscrepancies > 0));
  if (strict && hasRisk) process.exitCode = 1;
} catch (error) {
  console.error('Read-only schema preflight failed:', error?.code || 'DATABASE_ERROR');
  process.exitCode = 2;
} finally {
  try { await client.query('ROLLBACK'); } catch { /* Nothing to roll back on failed connection. */ }
  await client.end().catch(() => {});
}
