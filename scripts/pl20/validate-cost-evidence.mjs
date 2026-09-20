/**
 * PL20-03E1 DRY-RUN COST EVIDENCE VALIDATOR
 *
 * Deterministically evaluates candidate provider cost evidence before persistence.
 *
 * STRICT SAFETY GUARANTEES:
 * - Pure in-memory validator.
 * - NEVER persists to any database or table.
 * - NEVER calls Railway, Supabase, Stripe, or Resend APIs.
 * - NEVER promotes finalScaleReady or creates readiness scores.
 * - FAILS CLOSED on example/template inputs (example_only: true).
 * - REJECTS placeholder tokens (<...>, example, placeholder, sample-only).
 * - REQUIRES explicit input file argument in CLI mode.
 */

import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_PROVIDERS = ['railway', 'supabase', 'stripe', 'resend'];
const ALLOWED_RAILWAY_MODELS = ['resource_based', 'equal_allocation', 'shared_unallocated'];
const ALLOWED_STRIPE_SOURCE_TYPES = ['provider_export', 'provider_billing', 'stripe_dashboard_export'];

function isPlaceholderValue(val) {
  if (val === null || val === undefined) return false;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (/^<.*>$/.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  if (
    lower === 'example' ||
    lower === 'placeholder' ||
    lower === 'sample-only' ||
    lower === 'sample_only' ||
    lower === 'todo' ||
    lower === 'unknown'
  ) {
    return true;
  }
  if (
    lower.startsWith('placeholder') ||
    lower.startsWith('<') ||
    lower.endsWith('>') ||
    lower.includes('<') ||
    lower.includes('>')
  ) {
    return true;
  }
  return false;
}

function isValidDateString(str) {
  if (typeof str !== 'string') return false;
  if (isPlaceholderValue(str)) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && (d.getMonth() + 1) === month && d.getDate() === day;
}

function isValidIsoTimestamp(str) {
  if (typeof str !== 'string' || !str.trim()) return false;
  if (isPlaceholderValue(str)) return false;
  const time = Date.parse(str);
  return !Number.isNaN(time);
}

function normalizeInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'object') {
    return { period: null, providers: {} };
  }

  let topPeriod = null;
  if (rawInput.period && typeof rawInput.period === 'object') {
    topPeriod = {
      period_start: rawInput.period.period_start || null,
      period_end: rawInput.period.period_end || null
    };
  }

  const providers = {};

  if (Array.isArray(rawInput)) {
    for (const item of rawInput) {
      if (item && item.provider && ALLOWED_PROVIDERS.includes(String(item.provider).toLowerCase())) {
        providers[String(item.provider).toLowerCase()] = item;
      }
    }
  } else if (Array.isArray(rawInput.providers)) {
    for (const item of rawInput.providers) {
      if (item && item.provider && ALLOWED_PROVIDERS.includes(String(item.provider).toLowerCase())) {
        providers[String(item.provider).toLowerCase()] = item;
      }
    }
  } else if (rawInput.providers && typeof rawInput.providers === 'object') {
    for (const [key, value] of Object.entries(rawInput.providers)) {
      if (ALLOWED_PROVIDERS.includes(key.toLowerCase()) && value && typeof value === 'object') {
        providers[key.toLowerCase()] = { provider: key.toLowerCase(), ...value };
      }
    }
  } else {
    for (const [key, value] of Object.entries(rawInput)) {
      if (ALLOWED_PROVIDERS.includes(key.toLowerCase()) && value && typeof value === 'object') {
        providers[key.toLowerCase()] = { provider: key.toLowerCase(), ...value };
      }
    }
  }

  // Inherit top-level period if omitted in individual providers
  if (topPeriod) {
    for (const p of ALLOWED_PROVIDERS) {
      if (providers[p]) {
        if (!providers[p].period_start && topPeriod.period_start) {
          providers[p].period_start = topPeriod.period_start;
        }
        if (!providers[p].period_end && topPeriod.period_end) {
          providers[p].period_end = topPeriod.period_end;
        }
      }
    }
  }

  return { period: topPeriod, providers };
}

function validatePeriodAlignment(providers, topPeriod) {
  const periods = {};
  const activeProviders = [];

  for (const name of ALLOWED_PROVIDERS) {
    const rec = providers[name];
    if (rec && typeof rec === 'object' && Object.keys(rec).length > 0) {
      activeProviders.push(name);
      periods[name] = {
        period_start: rec.period_start || null,
        period_end: rec.period_end || null
      };
    }
  }

  if (activeProviders.length === 0) {
    return {
      period_match: false,
      period_start: topPeriod?.period_start || null,
      period_end: topPeriod?.period_end || null,
      reasons: ['No active provider records found to validate period.']
    };
  }

  const reasons = [];
  let referenceStart = periods[activeProviders[0]]?.period_start;
  let referenceEnd = periods[activeProviders[0]]?.period_end;

  if (topPeriod && topPeriod.period_start && topPeriod.period_end) {
    referenceStart = topPeriod.period_start;
    referenceEnd = topPeriod.period_end;
  }

  if (!isValidDateString(referenceStart) || !isValidDateString(referenceEnd)) {
    reasons.push(`Reference period is not a valid YYYY-MM-DD date range: ${referenceStart} to ${referenceEnd}`);
  } else if (referenceStart > referenceEnd) {
    reasons.push(`Period start (${referenceStart}) cannot be later than period end (${referenceEnd}).`);
  }

  // All 4 providers must match the exact period
  for (const name of ALLOWED_PROVIDERS) {
    const p = periods[name];
    if (!p) {
      reasons.push(`Missing provider record for '${name}', cannot verify common accounting period.`);
      continue;
    }
    if (p.period_start !== referenceStart || p.period_end !== referenceEnd) {
      reasons.push(
        `Provider '${name}' period (${p.period_start} to ${p.period_end}) does not match reference period (${referenceStart} to ${referenceEnd}).`
      );
    }
  }

  const period_match = reasons.length === 0;
  return {
    period_match,
    period_start: referenceStart || null,
    period_end: referenceEnd || null,
    reasons
  };
}

function validateRailway(rec) {
  if (!rec || typeof rec !== 'object' || Object.keys(rec).length <= 1) {
    return {
      state: 'NOT_MEASURED',
      amount: null,
      currency: rec?.currency || 'MXN',
      reasons: ['Railway cost record is missing or empty.']
    };
  }

  const reasons = [];
  const model = rec.allocation_model;

  if (!model || !ALLOWED_RAILWAY_MODELS.includes(model)) {
    return {
      state: 'PARTIAL',
      amount: null,
      currency: rec.currency || 'MXN',
      reasons: [`Railway allocation_model must be one of: ${ALLOWED_RAILWAY_MODELS.join(', ')}.`]
    };
  }

  if (model === 'shared_unallocated') {
    return {
      state: 'PARTIAL',
      amount: null,
      currency: rec.currency || 'MXN',
      reasons: [
        'Railway shared account cost is unallocated across shared hosts. Attributable ecommerce amount is unresolved.'
      ]
    };
  }

  // Common checks for resource_based and equal_allocation
  if (typeof rec.account_total !== 'number' || rec.account_total <= 0 || isPlaceholderValue(rec.account_total)) {
    reasons.push('Railway account_total must be a positive number.');
  }
  if (!Number.isInteger(rec.shared_hosts) || rec.shared_hosts < 1) {
    reasons.push('Railway shared_hosts must be an integer >= 1.');
  }
  if (!rec.evidence_reference || typeof rec.evidence_reference !== 'string' || !rec.evidence_reference.trim() || isPlaceholderValue(rec.evidence_reference)) {
    reasons.push('Railway evidence_reference must be a non-empty string path or reference, not a placeholder.');
  }
  if (!isValidIsoTimestamp(rec.measured_at) || isPlaceholderValue(rec.measured_at)) {
    reasons.push('Railway measured_at must be a valid ISO 8601 timestamp, not a placeholder.');
  }
  if (!rec.currency || typeof rec.currency !== 'string' || isPlaceholderValue(rec.currency)) {
    reasons.push('Railway currency must be specified (e.g. MXN).');
  }
  if (!rec.provided_by || typeof rec.provided_by !== 'string' || isPlaceholderValue(rec.provided_by)) {
    reasons.push('Railway provided_by must be specified, not a placeholder.');
  }

  if (model === 'equal_allocation') {
    const hasApproval = rec.operator_approved_equal_allocation === true || rec.explicit_approval === true;
    if (!hasApproval) {
      reasons.push('Equal allocation requires explicit operator approval flag (operator_approved_equal_allocation: true).');
    }

    const expectedAttributable = (typeof rec.account_total === 'number' && Number.isInteger(rec.shared_hosts) && rec.shared_hosts > 0)
      ? Number((rec.account_total / rec.shared_hosts).toFixed(2))
      : null;

    const recordedAmount = typeof rec.amount === 'number' ? Number(rec.amount.toFixed(2)) : null;

    if (recordedAmount === null || recordedAmount <= 0 || isPlaceholderValue(rec.amount)) {
      reasons.push('Railway attributable amount must be a positive number.');
    } else if (expectedAttributable !== null && Math.abs(recordedAmount - expectedAttributable) > 0.05) {
      reasons.push(`Attributable amount (${recordedAmount}) does not match equal allocation formula (account_total / shared_hosts = ${expectedAttributable}).`);
    }

    if (reasons.length > 0) {
      return {
        state: 'PARTIAL',
        amount: recordedAmount ?? expectedAttributable,
        currency: rec.currency || 'MXN',
        reasons
      };
    }

    return {
      state: 'MEASURED',
      amount: recordedAmount ?? expectedAttributable,
      currency: rec.currency || 'MXN',
      reasons: []
    };
  }

  if (model === 'resource_based') {
    if (!rec.usage_metric || typeof rec.usage_metric !== 'string' || !rec.usage_metric.trim() || isPlaceholderValue(rec.usage_metric)) {
      reasons.push('Resource-based allocation requires usage_metric (e.g. runtime-hours, memory-hours, CPU-hours), not a placeholder.');
    }
    if (!rec.usage_values || typeof rec.usage_values !== 'object') {
      reasons.push('Resource-based allocation requires usage_values object mapping host services to numbers.');
    } else {
      if (typeof rec.usage_values.ecommerce !== 'number' || rec.usage_values.ecommerce < 0) {
        reasons.push('Resource-based usage_values must contain a non-negative number for ecommerce host.');
      }
      const hostCount = Object.keys(rec.usage_values).length;
      if (Number.isInteger(rec.shared_hosts) && hostCount < rec.shared_hosts) {
        reasons.push(`Resource-based usage_values has ${hostCount} hosts, but shared_hosts is ${rec.shared_hosts}.`);
      }
    }
    if (!rec.allocation_formula || typeof rec.allocation_formula !== 'string' || !rec.allocation_formula.trim() || isPlaceholderValue(rec.allocation_formula)) {
      reasons.push('Resource-based allocation requires allocation_formula string, not a placeholder.');
    }
    if (typeof rec.amount !== 'number' || rec.amount < 0 || isPlaceholderValue(rec.amount)) {
      reasons.push('Resource-based attributable amount must be a non-negative number.');
    }

    if (reasons.length > 0) {
      return {
        state: 'PARTIAL',
        amount: typeof rec.amount === 'number' ? rec.amount : null,
        currency: rec.currency || 'MXN',
        reasons
      };
    }

    return {
      state: 'MEASURED',
      amount: rec.amount,
      currency: rec.currency || 'MXN',
      reasons: []
    };
  }

  return {
    state: 'PARTIAL',
    amount: null,
    currency: rec.currency || 'MXN',
    reasons: ['Unrecognized Railway allocation state.']
  };
}

function validateStripe(rec) {
  if (!rec || typeof rec !== 'object' || Object.keys(rec).length <= 1) {
    return {
      state: 'NOT_MEASURED',
      amount: null,
      currency: rec?.currency || 'MXN',
      reasons: ['Stripe cost record is missing or empty.']
    };
  }

  const isFeeScheduleOnly = (
    rec.source_type === 'fee_schedule_only' ||
    rec.amount === null ||
    rec.amount === undefined ||
    isPlaceholderValue(rec.amount) ||
    (Array.isArray(rec.caveats) && rec.caveats.some((c) => typeof c === 'string' && c.includes('2.9%') && (rec.amount === null || rec.amount === undefined))) ||
    (typeof rec.caveats === 'string' && rec.caveats.includes('2.9%') && (rec.amount === null || rec.amount === undefined))
  );

  if (isFeeScheduleOnly) {
    return {
      state: 'PARTIAL',
      amount: null,
      currency: rec.currency || 'MXN',
      reasons: [
        'Stripe fee schedule known (~2.9% + conditional 6 MXN), but actual period fee total is unknown. Do not calculate actual fees from schedule alone.'
      ]
    };
  }

  const reasons = [];

  if (typeof rec.amount !== 'number' || rec.amount < 0 || isPlaceholderValue(rec.amount)) {
    reasons.push('Stripe actual fee total amount must be a non-negative number, not a placeholder.');
  }
  if (!rec.currency || typeof rec.currency !== 'string' || isPlaceholderValue(rec.currency)) {
    reasons.push('Stripe currency must be specified (e.g. MXN).');
  }
  if (!rec.source_type || isPlaceholderValue(rec.source_type) || !ALLOWED_STRIPE_SOURCE_TYPES.includes(rec.source_type)) {
    reasons.push(`Stripe source_type must be one of: ${ALLOWED_STRIPE_SOURCE_TYPES.join(', ')}.`);
  }
  if (!rec.evidence_reference || typeof rec.evidence_reference !== 'string' || !rec.evidence_reference.trim() || isPlaceholderValue(rec.evidence_reference)) {
    reasons.push('Stripe evidence_reference must be a non-empty string path or export name, not a placeholder.');
  }
  if (!isValidIsoTimestamp(rec.measured_at) || isPlaceholderValue(rec.measured_at)) {
    reasons.push('Stripe measured_at must be a valid ISO 8601 timestamp, not a placeholder.');
  }
  if (!rec.refund_dispute_treatment || typeof rec.refund_dispute_treatment !== 'string' || !rec.refund_dispute_treatment.trim() || isPlaceholderValue(rec.refund_dispute_treatment)) {
    reasons.push('Stripe requires explicit refund/dispute treatment documentation (e.g. included, excluded, none_observed), not a placeholder.');
  }
  if (!rec.provided_by || typeof rec.provided_by !== 'string' || isPlaceholderValue(rec.provided_by)) {
    reasons.push('Stripe provided_by must be specified, not a placeholder.');
  }

  if (reasons.length > 0) {
    return {
      state: 'PARTIAL',
      amount: typeof rec.amount === 'number' ? rec.amount : null,
      currency: rec.currency || 'MXN',
      reasons
    };
  }

  return {
    state: 'MEASURED',
    amount: rec.amount,
    currency: rec.currency || 'MXN',
    reasons: []
  };
}

function validateZeroCostProvider(providerName, rec) {
  const displayName = providerName.charAt(0).toUpperCase() + providerName.slice(1);

  if (!rec || typeof rec !== 'object' || Object.keys(rec).length <= 1) {
    return {
      state: 'NOT_MEASURED',
      amount: null,
      currency: rec?.currency || 'MXN',
      reasons: [`${displayName} cost record is missing or empty.`]
    };
  }

  const reasons = [];

  if (rec.amount === 0) {
    const tier = (rec.plan || rec.tier || '').toLowerCase().trim();
    if (tier !== 'free') {
      reasons.push(`${displayName} amount is 0, but plan/tier is '${tier || 'unspecified'}' (expected 'free').`);
    }
    if (!rec.source_type || typeof rec.source_type !== 'string' || !rec.source_type.trim() || isPlaceholderValue(rec.source_type)) {
      reasons.push(`${displayName} zero-cost requires explicit source_type provenance, not a placeholder.`);
    }
    if (!rec.provided_by || typeof rec.provided_by !== 'string' || !rec.provided_by.trim() || isPlaceholderValue(rec.provided_by)) {
      reasons.push(`${displayName} zero-cost requires provided_by operator provenance, not a placeholder.`);
    }
    if (!isValidIsoTimestamp(rec.measured_at) || isPlaceholderValue(rec.measured_at)) {
      reasons.push(`${displayName} zero-cost requires valid ISO 8601 measured_at timestamp, not a placeholder.`);
    }
    if (!rec.evidence_reference || typeof rec.evidence_reference !== 'string' || !rec.evidence_reference.trim() || isPlaceholderValue(rec.evidence_reference)) {
      reasons.push(`${displayName} zero-cost requires explicit evidence_reference (dashboard/plan screenshot or export), not a placeholder.`);
    }

    const hasCaveats = (Array.isArray(rec.caveats) && rec.caveats.length > 0) || (typeof rec.caveats === 'string' && rec.caveats.trim().length > 0);
    if (!hasCaveats) {
      reasons.push(`${displayName} zero-cost requires caveats documenting current free-tier scope.`);
    }

    if (reasons.length > 0) {
      return {
        state: 'PARTIAL',
        amount: 0,
        currency: rec.currency || 'MXN',
        reasons: [
          `${displayName} 0 is valid only with explicit same-period free-tier provenance.`,
          ...reasons
        ]
      };
    }

    return {
      state: 'MEASURED',
      amount: 0,
      currency: rec.currency || 'MXN',
      reasons: []
    };
  }

  if (typeof rec.amount === 'number' && rec.amount > 0) {
    if (!rec.source_type || typeof rec.source_type !== 'string' || isPlaceholderValue(rec.source_type)) {
      reasons.push(`${displayName} paid cost requires source_type, not a placeholder.`);
    }
    if (!rec.evidence_reference || typeof rec.evidence_reference !== 'string' || isPlaceholderValue(rec.evidence_reference)) {
      reasons.push(`${displayName} paid cost requires evidence_reference, not a placeholder.`);
    }
    if (!isValidIsoTimestamp(rec.measured_at) || isPlaceholderValue(rec.measured_at)) {
      reasons.push(`${displayName} paid cost requires valid measured_at timestamp, not a placeholder.`);
    }

    if (reasons.length > 0) {
      return {
        state: 'PARTIAL',
        amount: rec.amount,
        currency: rec.currency || 'MXN',
        reasons
      };
    }

    return {
      state: 'MEASURED',
      amount: rec.amount,
      currency: rec.currency || 'MXN',
      reasons: []
    };
  }

  return {
    state: 'PARTIAL',
    amount: null,
    currency: rec.currency || 'MXN',
    reasons: [`${displayName} amount must be 0 (with free-tier provenance) or a positive measured paid amount.`]
  };
}

/**
 * Main pure in-memory validation function.
 *
 * @param {object|array} inputData
 * @returns {object} Machine-readable validation report
 */
export function validateCostEvidence(inputData) {
  // Fail closed on example / template input
  if (
    inputData?.example_only === true ||
    String(inputData?.example_only).toLowerCase() === 'true' ||
    inputData?.is_example === true ||
    String(inputData?.is_example).toLowerCase() === 'true'
  ) {
    const { period: topPeriod } = normalizeInput(inputData);
    return {
      period: {
        period_start: topPeriod?.period_start || null,
        period_end: topPeriod?.period_end || null,
        period_match: false
      },
      providers: {
        railway: { state: 'NOT_MEASURED', amount: null, currency: 'MXN', reasons: ['example/template input cannot be accepted as provider evidence'] },
        supabase: { state: 'NOT_MEASURED', amount: null, currency: 'MXN', reasons: ['example/template input cannot be accepted as provider evidence'] },
        stripe: { state: 'NOT_MEASURED', amount: null, currency: 'MXN', reasons: ['example/template input cannot be accepted as provider evidence'] },
        resend: { state: 'NOT_MEASURED', amount: null, currency: 'MXN', reasons: ['example/template input cannot be accepted as provider evidence'] }
      },
      cost_total_state: 'NOT_MEASURED',
      isCostEvidenceMeasured: false,
      blocking_reasons: [
        'example/template input cannot be accepted as provider evidence'
      ]
    };
  }

  const { period: topPeriod, providers } = normalizeInput(inputData);

  const periodValidation = validatePeriodAlignment(providers, topPeriod);

  const railwayResult = validateRailway(providers.railway);
  const supabaseResult = validateZeroCostProvider('supabase', providers.supabase);
  const stripeResult = validateStripe(providers.stripe);
  const resendResult = validateZeroCostProvider('resend', providers.resend);

  const allProvidersMeasured = (
    railwayResult.state === 'MEASURED' &&
    supabaseResult.state === 'MEASURED' &&
    stripeResult.state === 'MEASURED' &&
    resendResult.state === 'MEASURED'
  );

  const allProvidersNotMeasured = (
    railwayResult.state === 'NOT_MEASURED' &&
    supabaseResult.state === 'NOT_MEASURED' &&
    stripeResult.state === 'NOT_MEASURED' &&
    resendResult.state === 'NOT_MEASURED'
  );

  let cost_total_state = 'PARTIAL';
  let isCostEvidenceMeasured = false;

  if (allProvidersMeasured && periodValidation.period_match) {
    cost_total_state = 'MEASURED';
    isCostEvidenceMeasured = true;
  } else if (allProvidersNotMeasured) {
    cost_total_state = 'NOT_MEASURED';
    isCostEvidenceMeasured = false;
  } else {
    cost_total_state = 'PARTIAL';
    isCostEvidenceMeasured = false;
  }

  const blocking_reasons = [];

  if (!periodValidation.period_match) {
    blocking_reasons.push(...periodValidation.reasons);
  }

  if (railwayResult.state !== 'MEASURED') {
    blocking_reasons.push(`[railway:${railwayResult.state}] ${railwayResult.reasons.join('; ')}`);
  }
  if (supabaseResult.state !== 'MEASURED') {
    blocking_reasons.push(`[supabase:${supabaseResult.state}] ${supabaseResult.reasons.join('; ')}`);
  }
  if (stripeResult.state !== 'MEASURED') {
    blocking_reasons.push(`[stripe:${stripeResult.state}] ${stripeResult.reasons.join('; ')}`);
  }
  if (resendResult.state !== 'MEASURED') {
    blocking_reasons.push(`[resend:${resendResult.state}] ${resendResult.reasons.join('; ')}`);
  }

  if (!isCostEvidenceMeasured && blocking_reasons.length === 0) {
    blocking_reasons.push('Total cost evidence cannot be MEASURED until all four providers are MEASURED for an identical accounting period.');
  }

  return {
    period: {
      period_start: periodValidation.period_start,
      period_end: periodValidation.period_end,
      period_match: periodValidation.period_match
    },
    providers: {
      railway: railwayResult,
      supabase: supabaseResult,
      stripe: stripeResult,
      resend: resendResult
    },
    cost_total_state,
    isCostEvidenceMeasured,
    blocking_reasons
  };
}

/**
 * File loader and runner function.
 *
 * @param {string} [filePath] - Absolute or relative path to provider evidence JSON
 */
export function validateCostEvidenceFile(filePath) {
  if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error('explicit provider evidence input file is required');
  }
  const targetPath = path.resolve(process.cwd(), filePath.trim());
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Cost evidence file not found: ${targetPath}`);
  }
  const rawContent = fs.readFileSync(targetPath, 'utf8');
  const parsed = JSON.parse(rawContent);
  return validateCostEvidence(parsed);
}

// Direct invocation CLI handler
const isDirectCli = Boolean(
  process.argv[1] &&
  path.resolve(process.argv[1]).replace(/\\/g, '/').endsWith('/scripts/pl20/validate-cost-evidence.mjs')
);
if (isDirectCli) {
  const inputArg = process.argv[2];
  if (!inputArg || typeof inputArg !== 'string' || !inputArg.trim()) {
    console.error(JSON.stringify({ error: 'explicit provider evidence input file is required' }, null, 2));
    process.exit(1);
  }
  try {
    const report = validateCostEvidenceFile(inputArg);
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}
