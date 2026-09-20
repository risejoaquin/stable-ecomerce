import { describe, it, expect, vi } from 'vitest';
import { validateCostEvidence, validateCostEvidenceFile } from '../../scripts/pl20/validate-cost-evidence.mjs';

function createValidBaseRecords(): any {
  return {
    period: {
      period_start: '2026-08-01',
      period_end: '2026-08-31'
    },
    providers: {
      railway: {
        provider: 'railway',
        amount: 48,
        currency: 'MXN',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        actual_or_estimated: 'estimated',
        source_type: 'operator_approved_equal_allocation',
        provided_by: 'joaquin_operator',
        measured_at: '2026-09-19T12:00:00.000Z',
        evidence_reference: 'AGENT_CONTEXT/evidence/post-launch-20/railway-2026-08-invoice.png',
        allocation_model: 'equal_allocation',
        account_total: 192,
        shared_hosts: 4,
        operator_approved_equal_allocation: true,
        allocation_formula: 'account_total / shared_hosts',
        caveats: ['Equal allocation approved by operator.']
      },
      supabase: {
        provider: 'supabase',
        amount: 0,
        currency: 'MXN',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        plan: 'free',
        tier: 'free',
        actual_or_estimated: 'actual',
        source_type: 'provider_plan_or_operator_attested_free_tier',
        provided_by: 'joaquin_operator',
        measured_at: '2026-09-19T12:00:00.000Z',
        evidence_reference: 'AGENT_CONTEXT/evidence/post-launch-20/supabase-2026-08-plan.png',
        caveats: ['Current free tier only. Future paid plan excluded.']
      },
      stripe: {
        provider: 'stripe',
        amount: 142.50,
        currency: 'MXN',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        actual_or_estimated: 'actual',
        source_type: 'provider_export',
        provided_by: 'joaquin_operator',
        measured_at: '2026-09-19T12:00:00.000Z',
        evidence_reference: 'AGENT_CONTEXT/evidence/post-launch-20/stripe-2026-08-fees-export.csv',
        refund_dispute_treatment: 'included',
        gross_volume: 4900.00,
        caveats: ['Actual Stripe fee export total.']
      },
      resend: {
        provider: 'resend',
        amount: 0,
        currency: 'MXN',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        plan: 'free',
        tier: 'free',
        actual_or_estimated: 'actual',
        source_type: 'provider_plan_or_operator_attested_free_tier',
        provided_by: 'joaquin_operator',
        measured_at: '2026-09-19T12:00:00.000Z',
        evidence_reference: 'AGENT_CONTEXT/evidence/post-launch-20/resend-2026-08-plan.png',
        caveats: ['Current free tier only.']
      }
    }
  };
}

describe('PL20-03E1 Cost Evidence Intake Validator', () => {
  // Test 1: Four empty records => NOT_MEASURED
  it('1. classifies four empty records as NOT_MEASURED and isCostEvidenceMeasured as false', () => {
    const input = {
      period: null,
      providers: {
        railway: {},
        supabase: {},
        stripe: {},
        resend: {}
      }
    };
    const result = validateCostEvidence(input);
    expect(result.providers.railway.state).toBe('NOT_MEASURED');
    expect(result.providers.supabase.state).toBe('NOT_MEASURED');
    expect(result.providers.stripe.state).toBe('NOT_MEASURED');
    expect(result.providers.resend.state).toBe('NOT_MEASURED');
    expect(result.cost_total_state).toBe('NOT_MEASURED');
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 2: Mixed periods => PARTIAL
  it('2. rejects mixed periods with PARTIAL cost_total_state and isCostEvidenceMeasured = false', () => {
    const data = createValidBaseRecords();
    data.providers.stripe.period_start = '2026-07-01';
    data.providers.stripe.period_end = '2026-07-31';

    const result = validateCostEvidence(data);
    expect(result.period.period_match).toBe(false);
    expect(result.cost_total_state).toBe('PARTIAL');
    expect(result.isCostEvidenceMeasured).toBe(false);
    expect(result.blocking_reasons.some((r: string) => r.includes('stripe') && r.includes('does not match reference period'))).toBe(true);
  });

  // Test 3: Railway shared_unallocated => PARTIAL
  it('3. classifies Railway shared_unallocated as PARTIAL with amount = null', () => {
    const data = createValidBaseRecords();
    data.providers.railway.allocation_model = 'shared_unallocated';
    data.providers.railway.amount = null;

    const result = validateCostEvidence(data);
    expect(result.providers.railway.state).toBe('PARTIAL');
    expect(result.providers.railway.amount).toBeNull();
    expect(result.cost_total_state).toBe('PARTIAL');
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 4: Railway equal allocation without approval => PARTIAL
  it('4. classifies Railway equal_allocation without explicit operator approval as PARTIAL', () => {
    const data = createValidBaseRecords();
    data.providers.railway.operator_approved_equal_allocation = false;

    const result = validateCostEvidence(data);
    expect(result.providers.railway.state).toBe('PARTIAL');
    expect(result.providers.railway.reasons.some((r: string) => r.includes('explicit operator approval flag'))).toBe(true);
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 5: Railway equal allocation with complete approval/evidence => MEASURED
  it('5. classifies Railway equal_allocation with complete approval and evidence as MEASURED', () => {
    const data = createValidBaseRecords();
    const result = validateCostEvidence(data);
    expect(result.providers.railway.state).toBe('MEASURED');
    expect(result.providers.railway.amount).toBe(48);
  });

  // Test 6: Railway resource-based incomplete => PARTIAL
  it('6. classifies Railway resource_based with missing peer usage values as PARTIAL', () => {
    const data = createValidBaseRecords();
    data.providers.railway.allocation_model = 'resource_based';
    data.providers.railway.usage_metric = 'memory-hours';
    data.providers.railway.usage_values = { ecommerce: 120 }; // Only 1 host provided, shared_hosts is 4
    data.providers.railway.allocation_formula = 'ecommerce / total * 192';

    const result = validateCostEvidence(data);
    expect(result.providers.railway.state).toBe('PARTIAL');
    expect(result.providers.railway.reasons.some((r: string) => r.includes('shared_hosts is 4'))).toBe(true);
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 7: Stripe fee schedule only => PARTIAL
  it('7. classifies Stripe fee schedule only (or null amount) as PARTIAL', () => {
    const data = createValidBaseRecords();
    data.providers.stripe = {
      provider: 'stripe',
      amount: null,
      currency: 'MXN',
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      source_type: 'fee_schedule_only',
      caveats: ['approximately 2.9% + conditional 6 MXN in some cases']
    };

    const result = validateCostEvidence(data);
    expect(result.providers.stripe.state).toBe('PARTIAL');
    expect(result.providers.stripe.amount).toBeNull();
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 8: Stripe actual fee export complete => MEASURED
  it('8. classifies Stripe actual fee export with complete fields as MEASURED', () => {
    const data = createValidBaseRecords();
    const result = validateCostEvidence(data);
    expect(result.providers.stripe.state).toBe('MEASURED');
    expect(result.providers.stripe.amount).toBe(142.50);
  });

  // Test 9: Supabase 0 without provenance => not MEASURED
  it('9. rejects Supabase 0 without free-tier provenance as not MEASURED (PARTIAL)', () => {
    const data = createValidBaseRecords();
    data.providers.supabase = {
      provider: 'supabase',
      amount: 0,
      currency: 'MXN',
      period_start: '2026-08-01',
      period_end: '2026-08-31'
      // missing plan/tier, source_type, evidence_reference, caveats
    };

    const result = validateCostEvidence(data);
    expect(result.providers.supabase.state).toBe('PARTIAL');
    expect(result.providers.supabase.reasons.some((r: string) => r.includes('explicit same-period free-tier provenance'))).toBe(true);
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 10: Supabase free-tier complete => MEASURED
  it('10. classifies Supabase amount 0 with complete free-tier provenance as MEASURED', () => {
    const data = createValidBaseRecords();
    const result = validateCostEvidence(data);
    expect(result.providers.supabase.state).toBe('MEASURED');
    expect(result.providers.supabase.amount).toBe(0);
  });

  // Test 11: Resend 0 without provenance => not MEASURED
  it('11. rejects Resend 0 without free-tier provenance as not MEASURED (PARTIAL)', () => {
    const data = createValidBaseRecords();
    data.providers.resend = {
      provider: 'resend',
      amount: 0,
      currency: 'MXN',
      period_start: '2026-08-01',
      period_end: '2026-08-31'
      // missing plan, evidence_reference, etc.
    };

    const result = validateCostEvidence(data);
    expect(result.providers.resend.state).toBe('PARTIAL');
    expect(result.providers.resend.reasons.some((r: string) => r.includes('explicit same-period free-tier provenance'))).toBe(true);
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 12: Resend free-tier complete => MEASURED
  it('12. classifies Resend amount 0 with complete free-tier provenance as MEASURED', () => {
    const data = createValidBaseRecords();
    const result = validateCostEvidence(data);
    expect(result.providers.resend.state).toBe('MEASURED');
    expect(result.providers.resend.amount).toBe(0);
  });

  // Test 13: 3 measured + 1 partial => total PARTIAL
  it('13. sets cost_total_state = PARTIAL and isCostEvidenceMeasured = false when 3 are measured and 1 is partial', () => {
    const data = createValidBaseRecords();
    data.providers.railway.operator_approved_equal_allocation = false; // makes railway PARTIAL

    const result = validateCostEvidence(data);
    expect(result.providers.railway.state).toBe('PARTIAL');
    expect(result.providers.supabase.state).toBe('MEASURED');
    expect(result.providers.stripe.state).toBe('MEASURED');
    expect(result.providers.resend.state).toBe('MEASURED');
    expect(result.cost_total_state).toBe('PARTIAL');
    expect(result.isCostEvidenceMeasured).toBe(false);
  });

  // Test 14: All four measured same period => total MEASURED
  it('14. sets cost_total_state = MEASURED and isCostEvidenceMeasured = true when all 4 are MEASURED in identical period', () => {
    const data = createValidBaseRecords();
    const result = validateCostEvidence(data);
    expect(result.period.period_match).toBe(true);
    expect(result.providers.railway.state).toBe('MEASURED');
    expect(result.providers.supabase.state).toBe('MEASURED');
    expect(result.providers.stripe.state).toBe('MEASURED');
    expect(result.providers.resend.state).toBe('MEASURED');
    expect(result.cost_total_state).toBe('MEASURED');
    expect(result.isCostEvidenceMeasured).toBe(true);
    expect(result.blocking_reasons).toHaveLength(0);
  });

  // Test 15: No provider/API/database side effects
  it('15. executes strictly in memory with zero API, database, or process side effects', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const originalInput = createValidBaseRecords();
    const inputCopy = JSON.parse(JSON.stringify(originalInput));

    const result = validateCostEvidence(originalInput);

    // Assert fetch was never called
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    // Assert input was not mutated
    expect(originalInput).toEqual(inputCopy);

    // Assert result structure
    expect(result).toHaveProperty('cost_total_state');
    expect(result).toHaveProperty('isCostEvidenceMeasured');
    expect(result).toHaveProperty('blocking_reasons');
  });

  // Test 16: CLI/file loader fails closed with no file argument
  it('16. fails closed when validateCostEvidenceFile is called without an explicit file path', () => {
    expect(() => (validateCostEvidenceFile as any)()).toThrow('explicit provider evidence input file is required');
    expect(() => validateCostEvidenceFile('')).toThrow('explicit provider evidence input file is required');
    expect(() => validateCostEvidenceFile('   ')).toThrow('explicit provider evidence input file is required');
  });

  // Test 17: Example template cannot set isCostEvidenceMeasured=true
  it('17. verifies example template pl20-03e-provider-cost-input.example.json fails closed as non-evidence', () => {
    const result = validateCostEvidenceFile('AGENT_CONTEXT/evidence/post-launch-20/pl20-03e-provider-cost-input.example.json');
    expect(result.cost_total_state).toBe('NOT_MEASURED');
    expect(result.isCostEvidenceMeasured).toBe(false);
    expect(result.providers.railway.state).toBe('NOT_MEASURED');
    expect(result.providers.supabase.state).toBe('NOT_MEASURED');
    expect(result.providers.stripe.state).toBe('NOT_MEASURED');
    expect(result.providers.resend.state).toBe('NOT_MEASURED');
    expect(result.blocking_reasons).toContain('example/template input cannot be accepted as provider evidence');
  });

  // Test 18: example_only flag fails closed even if all other fields are populated
  it('18. rejects payload with example_only: true even if provider fields are fully populated', () => {
    const data = createValidBaseRecords();
    data.example_only = true;
    const result = validateCostEvidence(data);
    expect(result.cost_total_state).toBe('NOT_MEASURED');
    expect(result.isCostEvidenceMeasured).toBe(false);
    expect(result.blocking_reasons).toContain('example/template input cannot be accepted as provider evidence');
  });

  // Test 19: Rejects placeholder strings in evidence references and provenance
  it('19. rejects placeholder values (<...>, example, placeholder, sample-only) in evidence and provenance', () => {
    // Railway with placeholder evidence_reference
    const data1 = createValidBaseRecords();
    data1.providers.railway.evidence_reference = '<railway-invoice-path>';
    const result1 = validateCostEvidence(data1);
    expect(result1.providers.railway.state).toBe('PARTIAL');
    expect(result1.providers.railway.reasons.some((r: string) => r.includes('not a placeholder'))).toBe(true);
    expect(result1.isCostEvidenceMeasured).toBe(false);

    // Stripe with placeholder source_type
    const data2 = createValidBaseRecords();
    data2.providers.stripe.source_type = 'placeholder';
    const result2 = validateCostEvidence(data2);
    expect(result2.providers.stripe.state).toBe('PARTIAL');
    expect(result2.isCostEvidenceMeasured).toBe(false);

    // Supabase with placeholder provided_by
    const data3 = createValidBaseRecords();
    data3.providers.supabase.provided_by = '<operator_name>';
    const result3 = validateCostEvidence(data3);
    expect(result3.providers.supabase.state).toBe('PARTIAL');
    expect(result3.isCostEvidenceMeasured).toBe(false);

    // Resend with placeholder measured_at
    const data4 = createValidBaseRecords();
    data4.providers.resend.measured_at = '<2026-09-19T12:00:00Z>';
    const result4 = validateCostEvidence(data4);
    expect(result4.providers.resend.state).toBe('PARTIAL');
    expect(result4.isCostEvidenceMeasured).toBe(false);
  });
});
