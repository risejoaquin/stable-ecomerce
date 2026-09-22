import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { validateCostEvidenceFile } from './validate-cost-evidence.mjs';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('--inspect-only');
const storeIdArgIdx = args.indexOf('--store-id');
const explicitStoreId = storeIdArgIdx !== -1 ? args[storeIdArgIdx + 1] : process.env.STORE_ID;
const nonFlagArgs = args.filter((a, idx) => !a.startsWith('--') && (storeIdArgIdx === -1 || idx !== storeIdArgIdx + 1));

const inputPath = nonFlagArgs[0] || 'AGENT_CONTEXT/evidence/post-launch-20/pl20-03l-multi-currency-cost-intake.json';
const fullPath = path.resolve(inputPath);

console.log(`[PL20-03M] Validating candidate cost evidence package: ${fullPath}`);
const validation = validateCostEvidenceFile(fullPath);

if (!validation.isCostEvidenceMeasured || validation.cost_total_state !== 'MEASURED_MULTI_CURRENCY') {
  console.error('[PL20-03M] Validation FAILED. Cannot persist non-measured or partial evidence:', validation);
  process.exit(1);
}

console.log('[PL20-03M] Validation PASSED:');
console.log('  cost_total_state:', validation.cost_total_state);
console.log('  isCostEvidenceMeasured:', validation.isCostEvidenceMeasured);
console.log('  single_currency_total:', validation.single_currency_total);
console.log('  multi_currency_totals:', validation.multi_currency_totals);

const rawData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function persist() {
  // Resolve target store ID
  let storeId = explicitStoreId;
  let storeName = 'Explicit Store';
  if (storeId) {
    const sRes = await supabase.from('stores').select('id, name, slug').eq('id', storeId).single();
    if (sRes.data) {
      storeName = sRes.data.name;
    }
  } else {
    const slug = process.env.PRIMARY_STORE_SLUG || 'selfcare-sinners';
    const sBySlug = await supabase.from('stores').select('id, name, slug').eq('slug', slug).single();
    if (sBySlug.data) {
      storeId = sBySlug.data.id;
      storeName = sBySlug.data.name;
    } else {
      const sFirst = await supabase.from('stores').select('id, name, slug').order('created_at', { ascending: true }).limit(1).single();
      if (sFirst.data) {
        storeId = sFirst.data.id;
        storeName = sFirst.data.name;
      }
    }
  }

  if (!storeId) {
    console.error('[PL20-03M] Could not resolve store ID.');
    process.exit(1);
  }
  console.log(`[PL20-03M] Target Store: ${storeName} (${storeId})`);

  // Inspect existing rows
  const existingRows = await supabase.from('operating_cost_summaries').select('id, store_id, period, cost_key, total_estimate, currency, created_at');
  console.log(`[PL20-03M] Existing operating_cost_summaries count: ${existingRows.data?.length || 0}`);
  if (existingRows.data && existingRows.data.length > 0) {
    for (const r of existingRows.data) {
      console.log(`  - Row ID: ${r.id} | Store: ${r.store_id} | Period: ${r.period} | Key: ${r.cost_key} | Total: ${r.total_estimate} ${r.currency}`);
    }
  }

  if (isDryRun) {
    console.log('[PL20-03M] --dry-run / --inspect-only active. Exiting without modifying database.');
    return;
  }

  const period = '2026-08';
  const costKey = 'monthly_operating_cost_baseline';
  const measuredAt = rawData.providers.railway.measured_at || new Date().toISOString();

  // Multi-currency totals: USD 1.2574, MXN 7.96
  // single_currency_total = null, total_estimate = null
  const payload = {
    store_id: storeId,
    cost_key: costKey,
    period,
    railway_estimate: rawData.providers.railway.amount,
    supabase_estimate: rawData.providers.supabase.amount,
    stripe_variable_cost_estimate: rawData.providers.stripe.amount,
    email_cost_estimate: rawData.providers.resend.amount,
    total_estimate: null, // Strictly null: unlike currencies cannot be numerically summed
    currency: 'MXN', // Native store operational currency
    notes: 'Multi-currency operating cost baseline across all four providers (MEASURED_MULTI_CURRENCY, zero synthetic FX conversion).',
    generated_by: null,
    generated_at: measuredAt,
    metadata: {
      source: 'scripts/pl20/persist-cost-evidence.mjs',
      source_type: 'provider_evidence_aggregation',
      calculation_version: 'pl20-03m-v1',
      measured_at: measuredAt,
      measured_state: 'MEASURED',
      cost_total_state: 'MEASURED_MULTI_CURRENCY',
      is_cost_evidence_measured: true,
      is_multi_currency: true,
      single_currency_total: null,
      single_currency_total_state: 'NOT_COMPUTED_MULTI_CURRENCY',
      multi_currency_totals: {
        USD: rawData.providers.railway.amount,
        MXN: Number((rawData.providers.stripe.amount + rawData.providers.supabase.amount + rawData.providers.resend.amount).toFixed(4))
      },
      period: '2026-08',
      period_start: rawData.period.period_start,
      period_end: rawData.period.period_end,
      period_boundary_convention: rawData.period.period_convention || 'provider_billing_cycle',
      providers: {
        railway: rawData.providers.railway,
        supabase: rawData.providers.supabase,
        stripe: rawData.providers.stripe,
        resend: rawData.providers.resend,
        email: rawData.providers.resend
      }
    },
    updated_at: new Date().toISOString()
  };

  console.log('[PL20-03M] Upserting row into operating_cost_summaries...');
  const upsertRes = await supabase
    .from('operating_cost_summaries')
    .upsert([payload], { onConflict: 'store_id,period,cost_key' })
    .select();

  if (upsertRes.error) {
    console.error('[PL20-03M] Database upsert error:', upsertRes.error);
    process.exit(1);
  }

  console.log('[PL20-03M] Successfully persisted row ID:', upsertRes.data[0]?.id);

  // TASK 6: VERIFY DATABASE
  console.log('[PL20-03M] Reading back persisted row for verification...');
  const readRes = await supabase
    .from('operating_cost_summaries')
    .select('*')
    .eq('store_id', storeId)
    .eq('period', period)
    .eq('cost_key', costKey)
    .single();

  if (readRes.error || !readRes.data) {
    console.error('[PL20-03M] Read-back verification failed:', readRes.error);
    process.exit(1);
  }

  const row = readRes.data;
  const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
  const p = meta.providers;

  console.log('--- VERIFICATION REPORT ---');
  console.log('Row ID:', row.id);
  console.log('store_id:', row.store_id);
  console.log('period:', row.period);
  console.log('cost_key:', row.cost_key);
  console.log('total_estimate (DB column):', row.total_estimate);
  console.log('metadata.measured_state:', meta.measured_state);
  console.log('metadata.cost_total_state:', meta.cost_total_state);
  console.log('metadata.is_cost_evidence_measured:', meta.is_cost_evidence_measured);
  console.log('metadata.single_currency_total:', meta.single_currency_total);
  console.log('metadata.single_currency_total_state:', meta.single_currency_total_state);
  console.log('metadata.multi_currency_totals:', meta.multi_currency_totals);
  console.log('Railway:', p.railway.amount, p.railway.currency, p.railway.measured_state, p.railway.allocation_method);
  console.log('Supabase:', p.supabase.amount, p.supabase.currency, p.supabase.measured_state, p.supabase.allocation_method);
  console.log('Stripe:', p.stripe.amount, p.stripe.currency, p.stripe.measured_state, p.stripe.allocation_method);
  console.log('Resend:', p.resend.amount, p.resend.currency, p.resend.measured_state, p.resend.allocation_method);

  // Assertions
  const assertions = [
    { label: 'Railway is 1.2574 USD MEASURED', ok: p.railway.amount === 1.2574 && p.railway.currency === 'USD' && p.railway.measured_state === 'MEASURED' },
    { label: 'Supabase is 0.00 MXN MEASURED', ok: p.supabase.amount === 0.00 && p.supabase.currency === 'MXN' && p.supabase.measured_state === 'MEASURED' },
    { label: 'Stripe is 7.96 MXN MEASURED', ok: p.stripe.amount === 7.96 && p.stripe.currency === 'MXN' && p.stripe.measured_state === 'MEASURED' },
    { label: 'Resend is 0.00 MXN MEASURED', ok: p.resend.amount === 0.00 && p.resend.currency === 'MXN' && p.resend.measured_state === 'MEASURED' },
    { label: 'COST_MEASURED is true', ok: meta.is_cost_evidence_measured === true && meta.measured_state === 'MEASURED' },
    { label: 'single_currency_total is strictly null', ok: row.total_estimate === null && meta.single_currency_total === null },
    { label: 'single_currency_total_state is NOT_COMPUTED_MULTI_CURRENCY', ok: meta.single_currency_total_state === 'NOT_COMPUTED_MULTI_CURRENCY' },
    { label: 'total_estimate is not fabricated (0, 7.96, or 9.2174)', ok: row.total_estimate !== 0 && row.total_estimate !== 7.96 && row.total_estimate !== 9.2174 && row.total_estimate !== 9.22 }
  ];

  let allPassed = true;
  for (const a of assertions) {
    if (a.ok) {
      console.log(`  PASS: ${a.label}`);
    } else {
      console.error(`  FAIL: ${a.label}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error('[PL20-03M] Database verification failed one or more assertions.');
    process.exit(1);
  }

  console.log('[PL20-03M] ALL DATABASE VERIFICATIONS PASSED.');
}

persist().catch(err => {
  console.error('[PL20-03M] Persistence failed:', err);
  process.exit(1);
});
