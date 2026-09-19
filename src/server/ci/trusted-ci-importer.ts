export interface GitHubRunMetadata {
  id: number;
  attempt: number;
  workflow_name: string;
  repository: string;
  head_sha: string;
  event: string;
  conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'skipped' | string;
  job_conclusions?: Record<string, 'success' | 'failure' | 'cancelled' | 'skipped' | string>;
  step_conclusions?: Record<string, 'success' | 'failure' | 'cancelled' | 'skipped' | string>;
}

export interface QualityGateManifest {
  schema_version: string;
  repository: string;
  workflow_name: string;
  workflow_run_id: number;
  workflow_attempt: number;
  event: string;
  head_sha: string;
  started_at?: string;
  completed_at?: string;
  conclusion: string;
  dimensions: {
    release_gate?: { status: string; step_name?: string; conclusion?: string };
    build?: { status: string; step_name?: string; conclusion?: string };
    unit_tests?: { status: string; step_name?: string; conclusion?: string };
    secret_scan?: { status: string; step_name?: string; conclusion?: string };
    core_regression?: { status: string; step_name?: string; conclusion?: string };
    security_baseline?: { status: string; step_name?: string; conclusion?: string };
    [key: string]: any;
  };
}

export interface E2eManifest {
  schema_version: string;
  repository: string;
  workflow_name: string;
  workflow_run_id: number;
  workflow_attempt: number;
  event: string;
  head_sha: string;
  started_at?: string;
  completed_at?: string;
  conclusion: string;
  dimension: string;
  status: string;
  test_command: string;
  browser: string;
  base_url: string;
  server_command: string;
  external_services: string;
  caveats?: string[];
}

export interface ProductionSmokeManifest {
  schema_version: string;
  repository: string;
  workflow_name: string;
  workflow_run_id: number;
  workflow_attempt: number;
  event: string;
  expected_commit: string;
  deployed_commit: string;
  target_url: string;
  conclusion: string;
  validation_result: string;
  measured_at: string;
}

export interface ReviewedSecurityManifest {
  schema_version: string;
  repository: string;
  validated_commit_sha: string;
  reviewed_at: string;
  reviewer_class: 'chatgpt_web' | 'human_operator' | 'security_reviewer' | string;
  scope: {
    included: string[];
    excluded?: string[];
    time_window_start?: string | null;
    time_window_end?: string | null;
  };
  sources: Array<{
    source_type: string;
    reference: string;
    status: string;
    commit_sha?: string;
    findings?: any[];
    open_items?: any[];
    limitations?: any[];
  }>;
  critical_open_count: number;
  high_open_count: number;
  known_exceptions?: string[];
  caveats?: string[];
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_MEASURED' | 'STALE' | string;
}

export const ALLOWED_REVIEWER_CLASSES = ['chatgpt_web', 'human_operator', 'security_reviewer'];

export const REQUIRED_SECURITY_SOURCES = [
  'secret_scan',
  'security_baseline',
  'core_regression',
  'known_issues',
  'dependency_vulnerabilities',
  'pl20_trust_boundary'
];

/**
 * Validates the basic schema of a Quality Gate manifest.
 */
export function validateQualityGateManifest(manifest: any): { valid: boolean; error?: string } {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'Manifest must be a non-null object' };
  }
  if (manifest.schema_version !== 'pl20-ci-evidence-v1') {
    return { valid: false, error: `Invalid schema_version: expected 'pl20-ci-evidence-v1', got '${manifest.schema_version}'` };
  }
  if (!manifest.repository || !manifest.workflow_name || !manifest.workflow_run_id || !manifest.workflow_attempt || !manifest.head_sha) {
    return { valid: false, error: 'Missing required identity fields (repository, workflow_name, workflow_run_id, workflow_attempt, head_sha)' };
  }
  if (!manifest.dimensions || typeof manifest.dimensions !== 'object') {
    return { valid: false, error: 'Missing or invalid dimensions object in manifest' };
  }
  return { valid: true };
}

/**
 * Validates the basic schema of an E2E manifest.
 */
export function validateE2eManifest(manifest: any): { valid: boolean; error?: string } {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'Manifest must be a non-null object' };
  }
  if (manifest.schema_version !== 'pl20-ci-evidence-v1') {
    return { valid: false, error: `Invalid schema_version: expected 'pl20-ci-evidence-v1', got '${manifest.schema_version}'` };
  }
  if (!manifest.repository || !manifest.workflow_name || !manifest.workflow_run_id || !manifest.workflow_attempt || !manifest.head_sha) {
    return { valid: false, error: 'Missing required identity fields' };
  }
  if (manifest.dimension !== 'e2e') {
    return { valid: false, error: `Invalid dimension: expected 'e2e', got '${manifest.dimension}'` };
  }
  if (!manifest.test_command || !manifest.status) {
    return { valid: false, error: 'Missing test_command or status in E2E manifest' };
  }
  return { valid: true };
}

/**
 * Validates the basic schema of a Production Smoke manifest.
 */
export function validateProductionSmokeManifest(manifest: any): { valid: boolean; error?: string } {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'Manifest must be a non-null object' };
  }
  if (manifest.schema_version !== 'pl20-ci-evidence-v1') {
    return { valid: false, error: `Invalid schema_version: expected 'pl20-ci-evidence-v1', got '${manifest.schema_version}'` };
  }
  if (!manifest.repository || !manifest.workflow_name || !manifest.workflow_run_id || !manifest.workflow_attempt) {
    return { valid: false, error: 'Missing required workflow identity fields' };
  }
  if (!manifest.expected_commit || !manifest.deployed_commit) {
    return { valid: false, error: 'Production smoke manifest requires both expected_commit and deployed_commit' };
  }
  return { valid: true };
}

/**
 * Validates the basic schema of a Reviewed Security manifest.
 */
export function validateReviewedSecurityManifest(manifest: any): { valid: boolean; error?: string } {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'Manifest must be a non-null object' };
  }
  if (manifest.schema_version !== 'pl20-reviewed-security-v1') {
    return { valid: false, error: `Invalid schema_version: expected 'pl20-reviewed-security-v1', got '${manifest.schema_version}'` };
  }
  if (!manifest.repository || !manifest.validated_commit_sha || !manifest.reviewed_at || !manifest.reviewer_class) {
    return { valid: false, error: 'Missing required metadata (repository, validated_commit_sha, reviewed_at, reviewer_class)' };
  }
  if (!manifest.scope || !Array.isArray(manifest.scope?.included)) {
    return { valid: false, error: 'Missing scope.included array' };
  }
  if (!Array.isArray(manifest.sources)) {
    return { valid: false, error: 'Missing sources array' };
  }
  if (typeof manifest.critical_open_count !== 'number' || typeof manifest.high_open_count !== 'number') {
    return { valid: false, error: 'critical_open_count and high_open_count must be explicit numbers' };
  }
  return { valid: true };
}

/**
 * Independently verifies Quality Gate manifest against trusted GitHub API run metadata.
 */
export function verifyQualityGateImport(options: {
  manifest: QualityGateManifest;
  gitHubRun: GitHubRunMetadata;
  evaluatedCommitSha: string;
  artifactName?: string;
}): {
  success: boolean;
  error?: string;
  records?: Record<string, any>;
} {
  const { manifest, gitHubRun, evaluatedCommitSha, artifactName } = options;

  // 1. Validate manifest schema
  const schemaValidation = validateQualityGateManifest(manifest);
  if (!schemaValidation.valid) {
    return { success: false, error: `Schema invalid: ${schemaValidation.error}` };
  }

  // 2. Reject wrong repository
  if (manifest.repository !== 'risejoaquin/stable-ecomerce' || gitHubRun.repository !== 'risejoaquin/stable-ecomerce') {
    return { success: false, error: `Wrong repository rejected: expected 'risejoaquin/stable-ecomerce', got manifest '${manifest.repository}' / run '${gitHubRun.repository}'` };
  }
  if (manifest.repository !== gitHubRun.repository) {
    return { success: false, error: 'Manifest repository does not match GitHub run repository' };
  }

  // 3. Reject wrong workflow
  if (gitHubRun.workflow_name !== 'Selfcare Quality Gate' || manifest.workflow_name !== 'Selfcare Quality Gate') {
    return { success: false, error: `Wrong workflow rejected: expected 'Selfcare Quality Gate', got '${manifest.workflow_name}' / '${gitHubRun.workflow_name}'` };
  }

  // 4. Reject wrong run ID
  if (manifest.workflow_run_id !== gitHubRun.id) {
    return { success: false, error: `Wrong run ID rejected: manifest '${manifest.workflow_run_id}' != run '${gitHubRun.id}'` };
  }

  // 5. Reject wrong attempt
  if (manifest.workflow_attempt !== gitHubRun.attempt) {
    return { success: false, error: `Wrong attempt rejected: manifest '${manifest.workflow_attempt}' != run '${gitHubRun.attempt}'` };
  }

  // 6. Reject wrong SHA
  if (manifest.head_sha !== gitHubRun.head_sha) {
    return { success: false, error: `Wrong SHA rejected: manifest '${manifest.head_sha}' != run '${gitHubRun.head_sha}'` };
  }

  // 7. Verify artifact identity if artifactName provided
  if (artifactName) {
    const expectedPrefix = `pl20-evidence-quality-gate-${gitHubRun.id}-${gitHubRun.attempt}`;
    if (!artifactName.includes(expectedPrefix)) {
      return { success: false, error: `Artifact identity mismatch: '${artifactName}' does not match expected prefix '${expectedPrefix}'` };
    }
  }

  // 8. Stale run check
  const isStale = Boolean(evaluatedCommitSha && gitHubRun.head_sha !== evaluatedCommitSha);

  // 9. Independent conclusion verification:
  // Failed job cannot manifest as PASS!
  const runSucceeded = gitHubRun.conclusion === 'success';

  const dimensionsToProcess = ['build', 'unit_tests', 'secret_scan', 'core_regression', 'security_baseline'];
  const records: Record<string, any> = {};

  for (const dim of dimensionsToProcess) {
    const rawDim = manifest.dimensions?.[dim];
    const manifestDimStatus = rawDim?.status?.toUpperCase() || 'NOT_MEASURED';

    // Step conclusion from GitHub metadata if available
    const stepConclusion = gitHubRun.step_conclusions?.[dim];
    let resolvedStatus: 'PASS' | 'FAIL' | 'STALE' | 'NOT_MEASURED';

    if (isStale) {
      resolvedStatus = 'STALE';
    } else if (!runSucceeded || (stepConclusion && stepConclusion !== 'success')) {
      // If run failed or step failed, it CANNOT be PASS
      resolvedStatus = 'FAIL';
    } else if (manifestDimStatus === 'PASS') {
      resolvedStatus = 'PASS';
    } else if (manifestDimStatus === 'FAIL') {
      resolvedStatus = 'FAIL';
    } else {
      resolvedStatus = 'NOT_MEASURED';
    }

    const idempotencyKey = `${dim}:${gitHubRun.id}:${gitHubRun.attempt}:${gitHubRun.head_sha}`;

    records[dim] = {
      assessment_key: `technical_${dim}`,
      status: resolvedStatus,
      origin: 'persisted_trusted_import',
      source_classification: 'VERIFIED_CI_EVIDENCE',
      validated_commit_sha: gitHubRun.head_sha,
      workflow_name: gitHubRun.workflow_name,
      workflow_run_id: gitHubRun.id,
      workflow_attempt: gitHubRun.attempt,
      event: gitHubRun.event,
      measured_at: manifest.completed_at || new Date().toISOString(),
      evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
      artifact_name: artifactName || `pl20-evidence-quality-gate-${gitHubRun.id}-${gitHubRun.attempt}`,
      manifest_path: 'pl20-evidence/quality-gate.json',
      idempotency_key: idempotencyKey,
      evidence: {
        classification: 'VERIFIED_CI_EVIDENCE',
        origin: 'persisted_trusted_import',
        dimension: `technical.${dim}.status`,
        status: resolvedStatus,
        validated_commit_sha: gitHubRun.head_sha,
        workflow_name: gitHubRun.workflow_name,
        workflow_run_id: gitHubRun.id,
        workflow_attempt: gitHubRun.attempt,
        event: gitHubRun.event,
        conclusion: gitHubRun.conclusion,
        evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
        artifact_name: artifactName || `pl20-evidence-quality-gate-${gitHubRun.id}-${gitHubRun.attempt}`,
        manifest_path: 'pl20-evidence/quality-gate.json',
        imported_at: new Date().toISOString(),
        provenance_version: 'pl20-ci-evidence-v1'
      },
      metadata: {
        source: 'github_actions_artifact_import',
        source_type: 'github_actions_verified',
        measured_state: resolvedStatus === 'NOT_MEASURED' ? 'NOT_MEASURED' : 'MEASURED',
        calculation_version: 'pl20-ci-evidence-v1',
        trusted_import: true,
        origin: 'persisted_trusted_import',
        classification: 'VERIFIED_CI_EVIDENCE',
        idempotency_key: idempotencyKey,
        repository: gitHubRun.repository,
        workflow_run_id: gitHubRun.id,
        workflow_attempt: gitHubRun.attempt,
        validated_commit_sha: gitHubRun.head_sha
      }
    };
  }

  // Release gate dimension:
  // release_gate PASS only if required quality + e2e jobs succeed!
  const e2eJobConclusion = gitHubRun.job_conclusions?.['e2e'];
  const qualityJobConclusion = gitHubRun.job_conclusions?.['quality'] || gitHubRun.conclusion;

  let releaseGateStatus: 'PASS' | 'FAIL' | 'STALE' | 'NOT_MEASURED';
  if (isStale) {
    releaseGateStatus = 'STALE';
  } else if (!runSucceeded || qualityJobConclusion !== 'success' || (e2eJobConclusion && e2eJobConclusion !== 'success')) {
    releaseGateStatus = 'FAIL';
  } else {
    // If quality dimensions passed and run succeeded
    const allQualityDimsPass = Object.values(records).every(r => r.status === 'PASS');
    releaseGateStatus = allQualityDimsPass ? 'PASS' : 'FAIL';
  }

  const rgIdempotencyKey = `release_gate:${gitHubRun.id}:${gitHubRun.attempt}:${gitHubRun.head_sha}`;
  records['release_gate'] = {
    assessment_key: 'technical_release_gate',
    status: releaseGateStatus,
    origin: 'persisted_trusted_import',
    source_classification: 'VERIFIED_CI_EVIDENCE',
    validated_commit_sha: gitHubRun.head_sha,
    workflow_name: gitHubRun.workflow_name,
    workflow_run_id: gitHubRun.id,
    workflow_attempt: gitHubRun.attempt,
    event: gitHubRun.event,
    measured_at: manifest.completed_at || new Date().toISOString(),
    evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
    artifact_name: artifactName || `pl20-evidence-quality-gate-${gitHubRun.id}-${gitHubRun.attempt}`,
    manifest_path: 'pl20-evidence/quality-gate.json',
    idempotency_key: rgIdempotencyKey,
    evidence: {
      classification: 'VERIFIED_CI_EVIDENCE',
      origin: 'persisted_trusted_import',
      dimension: 'technical.release_gate.status',
      status: releaseGateStatus,
      validated_commit_sha: gitHubRun.head_sha,
      workflow_name: gitHubRun.workflow_name,
      workflow_run_id: gitHubRun.id,
      workflow_attempt: gitHubRun.attempt,
      event: gitHubRun.event,
      conclusion: gitHubRun.conclusion,
      evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
      artifact_name: artifactName || `pl20-evidence-quality-gate-${gitHubRun.id}-${gitHubRun.attempt}`,
      manifest_path: 'pl20-evidence/quality-gate.json',
      imported_at: new Date().toISOString(),
      provenance_version: 'pl20-ci-evidence-v1'
    },
    metadata: {
      source: 'github_actions_artifact_import',
      source_type: 'github_actions_verified',
      measured_state: 'MEASURED',
      calculation_version: 'pl20-ci-evidence-v1',
      trusted_import: true,
      origin: 'persisted_trusted_import',
      classification: 'VERIFIED_CI_EVIDENCE',
      idempotency_key: rgIdempotencyKey,
      repository: gitHubRun.repository,
      workflow_run_id: gitHubRun.id,
      workflow_attempt: gitHubRun.attempt,
      validated_commit_sha: gitHubRun.head_sha
    }
  };

  return { success: true, records };
}

/**
 * Independently verifies E2E manifest against trusted GitHub API run metadata.
 * E2E PASS is impossible without real E2E job success.
 */
export function verifyE2eImport(options: {
  manifest: E2eManifest;
  gitHubRun: GitHubRunMetadata;
  evaluatedCommitSha: string;
  artifactName?: string;
}): {
  success: boolean;
  error?: string;
  record?: any;
} {
  const { manifest, gitHubRun, evaluatedCommitSha, artifactName } = options;

  const schemaValidation = validateE2eManifest(manifest);
  if (!schemaValidation.valid) {
    return { success: false, error: `Schema invalid: ${schemaValidation.error}` };
  }

  if (manifest.repository !== 'risejoaquin/stable-ecomerce' || gitHubRun.repository !== 'risejoaquin/stable-ecomerce') {
    return { success: false, error: 'Wrong repository rejected' };
  }
  if (manifest.repository !== gitHubRun.repository) {
    return { success: false, error: 'Manifest repository does not match GitHub run repository' };
  }
  if (manifest.workflow_run_id !== gitHubRun.id) {
    return { success: false, error: 'Wrong run ID rejected' };
  }
  if (manifest.workflow_attempt !== gitHubRun.attempt) {
    return { success: false, error: 'Wrong attempt rejected' };
  }
  if (manifest.head_sha !== gitHubRun.head_sha) {
    return { success: false, error: 'Wrong SHA rejected' };
  }

  if (artifactName) {
    const expectedPrefix = `pl20-evidence-e2e-${gitHubRun.id}-${gitHubRun.attempt}`;
    if (!artifactName.includes(expectedPrefix)) {
      return { success: false, error: `Artifact identity mismatch for E2E: expected '${expectedPrefix}'` };
    }
  }

  const isStale = Boolean(evaluatedCommitSha && gitHubRun.head_sha !== evaluatedCommitSha);

  // E2E PASS impossible without real E2E job success (Task 16 test 1):
  // Check if E2E job exists and succeeded in GitHub metadata
  const e2eJobConclusion = gitHubRun.job_conclusions?.['e2e'] || gitHubRun.step_conclusions?.['e2e'];
  const hasRealE2eSuccess = e2eJobConclusion === 'success' || (gitHubRun.conclusion === 'success' && !gitHubRun.job_conclusions);

  let resolvedStatus: 'PASS' | 'FAIL' | 'STALE' | 'NOT_MEASURED';
  if (isStale) {
    resolvedStatus = 'STALE';
  } else if (!hasRealE2eSuccess || manifest.status !== 'PASS') {
    resolvedStatus = 'FAIL';
  } else {
    resolvedStatus = 'PASS';
  }

  const idempotencyKey = `e2e:${gitHubRun.id}:${gitHubRun.attempt}:${gitHubRun.head_sha}`;

  const record = {
    assessment_key: 'technical_e2e',
    status: resolvedStatus,
    origin: 'persisted_trusted_import',
    source_classification: 'VERIFIED_CI_EVIDENCE',
    validated_commit_sha: gitHubRun.head_sha,
    workflow_name: gitHubRun.workflow_name,
    workflow_identity: `${gitHubRun.workflow_name} / e2e`,
    workflow_run_id: gitHubRun.id,
    workflow_attempt: gitHubRun.attempt,
    event: gitHubRun.event,
    measured_at: manifest.completed_at || new Date().toISOString(),
    evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
    artifact_name: artifactName || `pl20-evidence-e2e-${gitHubRun.id}-${gitHubRun.attempt}`,
    manifest_path: 'pl20-evidence/e2e.json',
    idempotency_key: idempotencyKey,
    evidence: {
      classification: 'VERIFIED_CI_EVIDENCE',
      origin: 'persisted_trusted_import',
      dimension: 'technical.e2e.status',
      status: resolvedStatus,
      validated_commit_sha: gitHubRun.head_sha,
      workflow_name: gitHubRun.workflow_name,
      workflow_identity: `${gitHubRun.workflow_name} / e2e`,
      workflow_run_id: gitHubRun.id,
      workflow_attempt: gitHubRun.attempt,
      event: gitHubRun.event,
      conclusion: gitHubRun.conclusion,
      evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
      artifact_name: artifactName || `pl20-evidence-e2e-${gitHubRun.id}-${gitHubRun.attempt}`,
      manifest_path: 'pl20-evidence/e2e.json',
      imported_at: new Date().toISOString(),
      provenance_version: 'pl20-ci-evidence-v1',
      test_command: manifest.test_command,
      browser: manifest.browser
    },
    metadata: {
      source: 'github_actions_artifact_import',
      source_type: 'github_actions_verified',
      measured_state: 'MEASURED',
      calculation_version: 'pl20-ci-evidence-v1',
      trusted_import: true,
      origin: 'persisted_trusted_import',
      classification: 'VERIFIED_CI_EVIDENCE',
      idempotency_key: idempotencyKey,
      repository: gitHubRun.repository,
      workflow_name: gitHubRun.workflow_name,
      workflow_identity: `${gitHubRun.workflow_name} / e2e`,
      workflow_run_id: gitHubRun.id,
      workflow_attempt: gitHubRun.attempt,
      validated_commit_sha: gitHubRun.head_sha
    }
  };

  return { success: true, record };
}

/**
 * Independently verifies Production Smoke manifest against trusted GitHub API run metadata.
 */
export function verifyProductionSmokeImport(options: {
  manifest: ProductionSmokeManifest;
  gitHubRun: GitHubRunMetadata;
  evaluatedCommitSha: string;
  artifactName?: string;
}): {
  success: boolean;
  error?: string;
  record?: any;
} {
  const { manifest, gitHubRun, evaluatedCommitSha, artifactName } = options;

  const schemaValidation = validateProductionSmokeManifest(manifest);
  if (!schemaValidation.valid) {
    return { success: false, error: `Schema invalid: ${schemaValidation.error}` };
  }

  if (manifest.repository !== 'risejoaquin/stable-ecomerce' || gitHubRun.repository !== 'risejoaquin/stable-ecomerce') {
    return { success: false, error: 'Wrong repository rejected' };
  }
  if (gitHubRun.workflow_name !== 'Selfcare Production Smoke' || manifest.workflow_name !== 'Selfcare Production Smoke') {
    return { success: false, error: 'Wrong workflow rejected: expected Selfcare Production Smoke' };
  }
  if (manifest.workflow_run_id !== gitHubRun.id) {
    return { success: false, error: 'Wrong run ID rejected' };
  }
  if (manifest.workflow_attempt !== gitHubRun.attempt) {
    return { success: false, error: 'Wrong attempt rejected' };
  }

  // Task 16 test 13: skipped smoke cannot PASS!
  if (gitHubRun.conclusion === 'skipped' || manifest.conclusion === 'skipped') {
    return { success: false, error: 'Skipped smoke cannot PASS' };
  }

  // Task 16 test 12: production smoke expected/deployed mismatch rejected
  if (!manifest.expected_commit || !manifest.deployed_commit || manifest.expected_commit !== manifest.deployed_commit) {
    return {
      success: false,
      error: `Production smoke expected/deployed mismatch rejected: expected '${manifest.expected_commit}' != deployed '${manifest.deployed_commit}'`
    };
  }

  if (artifactName) {
    const expectedPrefix = `pl20-evidence-production-smoke-${gitHubRun.id}-${gitHubRun.attempt}`;
    if (!artifactName.includes(expectedPrefix)) {
      return { success: false, error: `Artifact identity mismatch for production smoke: expected '${expectedPrefix}'` };
    }
  }

  const isStale = Boolean(evaluatedCommitSha && manifest.deployed_commit !== evaluatedCommitSha);

  const runSucceeded = gitHubRun.conclusion === 'success' && manifest.conclusion === 'success' && manifest.validation_result === 'PASS';

  let resolvedStatus: 'PASS' | 'FAIL' | 'STALE' | 'NOT_MEASURED';
  if (isStale) {
    resolvedStatus = 'STALE';
  } else if (!runSucceeded) {
    resolvedStatus = 'FAIL';
  } else {
    resolvedStatus = 'PASS';
  }

  const idempotencyKey = `production_smoke:${gitHubRun.id}:${gitHubRun.attempt}:${manifest.deployed_commit}`;

  const record = {
    assessment_key: 'technical_production_smoke',
    status: resolvedStatus,
    origin: 'persisted_trusted_import',
    source_classification: 'VERIFIED_CI_EVIDENCE',
    validated_commit_sha: manifest.deployed_commit,
    workflow_name: gitHubRun.workflow_name,
    workflow_run_id: gitHubRun.id,
    workflow_attempt: gitHubRun.attempt,
    event: gitHubRun.event,
    measured_at: manifest.measured_at || new Date().toISOString(),
    evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
    artifact_name: artifactName || `pl20-evidence-production-smoke-${gitHubRun.id}-${gitHubRun.attempt}`,
    manifest_path: 'pl20-evidence/production-smoke.json',
    idempotency_key: idempotencyKey,
    evidence: {
      classification: 'VERIFIED_CI_EVIDENCE',
      origin: 'persisted_trusted_import',
      dimension: 'technical.production_smoke.status',
      status: resolvedStatus,
      validated_commit_sha: manifest.deployed_commit,
      expected_commit: manifest.expected_commit,
      deployed_commit: manifest.deployed_commit,
      workflow_name: gitHubRun.workflow_name,
      workflow_run_id: gitHubRun.id,
      workflow_attempt: gitHubRun.attempt,
      event: gitHubRun.event,
      conclusion: gitHubRun.conclusion,
      evidence_reference: `https://github.com/${gitHubRun.repository}/actions/runs/${gitHubRun.id}`,
      artifact_name: artifactName || `pl20-evidence-production-smoke-${gitHubRun.id}-${gitHubRun.attempt}`,
      manifest_path: 'pl20-evidence/production-smoke.json',
      imported_at: new Date().toISOString(),
      provenance_version: 'pl20-ci-evidence-v1'
    },
    metadata: {
      source: 'github_actions_artifact_import',
      source_type: 'github_actions_verified',
      measured_state: 'MEASURED',
      calculation_version: 'pl20-ci-evidence-v1',
      trusted_import: true,
      origin: 'persisted_trusted_import',
      classification: 'VERIFIED_CI_EVIDENCE',
      idempotency_key: idempotencyKey,
      repository: gitHubRun.repository,
      workflow_run_id: gitHubRun.id,
      workflow_attempt: gitHubRun.attempt,
      validated_commit_sha: manifest.deployed_commit
    }
  };

  return { success: true, record };
}

/**
 * Independently verifies Reviewed Security Manifest.
 */
export function verifyReviewedSecurityManifestInput(options: {
  manifest: ReviewedSecurityManifest;
  evaluatedCommitSha: string;
  callerClass?: string;
}): {
  success: boolean;
  error?: string;
  record?: any;
} {
  const { manifest, evaluatedCommitSha, callerClass } = options;

  const schemaValidation = validateReviewedSecurityManifest(manifest);
  if (!schemaValidation.valid) {
    return { success: false, error: `Schema invalid: ${schemaValidation.error}` };
  }

  // Task 16 test 3: wrong repository rejected
  if (manifest.repository !== 'risejoaquin/stable-ecomerce') {
    return { success: false, error: `Wrong repository rejected: expected 'risejoaquin/stable-ecomerce', got '${manifest.repository}'` };
  }

  // Task 11 & Task 16 test 14: reviewer_class check; request-body spoof rejected
  const reviewerClass = String(manifest.reviewer_class || '').toLowerCase().trim();
  if (!ALLOWED_REVIEWER_CLASSES.includes(reviewerClass)) {
    return {
      success: false,
      error: `Unauthorized reviewer class: '${manifest.reviewer_class}'. Allowed classes: ${ALLOWED_REVIEWER_CLASSES.join(', ')}`
    };
  }

  if (callerClass && !ALLOWED_REVIEWER_CLASSES.includes(callerClass)) {
    return {
      success: false,
      error: `Caller class '${callerClass}' cannot self-promote evidence to reviewed_security`
    };
  }

  // Task 12: Minimum reviewed sources
  // Secret scan, security baseline, core regression, known issues, dependency review, PL20 trust boundary
  const sourceTypes = (manifest.sources || []).map(s => String(s.source_type || '').toLowerCase());
  const hasSecretScan = sourceTypes.some(t => t.includes('secret'));
  const hasBaseline = sourceTypes.some(t => t.includes('baseline'));
  const hasRegression = sourceTypes.some(t => t.includes('regression'));
  const hasKnownIssues = sourceTypes.some(t => t.includes('known_issues') || t.includes('known-issues'));
  const hasDependency = sourceTypes.some(t => t.includes('dependency') || t.includes('npm_audit'));
  const hasTrustBoundary = sourceTypes.some(t => t.includes('trust_boundary') || t.includes('trust-boundary'));

  const hasCompleteSources = hasSecretScan && hasBaseline && hasRegression && hasKnownIssues && hasDependency && hasTrustBoundary;
  if (!hasCompleteSources) {
    return {
      success: false,
      error: 'Reviewed security manifest scope is insufficient: must review Secret Scan, Security Baseline, Core Regression, Known Issues, Dependency review, and Trust Boundary'
    };
  }

  // Task 15: Freshness (exact evaluated SHA required)
  const isStale = Boolean(evaluatedCommitSha && manifest.validated_commit_sha !== evaluatedCommitSha);

  // Task 14 & Task 16 test 16: critical_open_count > 0 => FAIL
  const criticalCount = Number(manifest.critical_open_count);
  const highCount = Number(manifest.high_open_count);

  let status: 'PASS' | 'FAIL' | 'PARTIAL' | 'STALE' | 'NOT_MEASURED';

  if (isStale) {
    status = 'STALE';
  } else if (criticalCount > 0) {
    status = 'FAIL';
  } else {
    // Task 14 & Task 16 test 18: unreviewed HIGH => PARTIAL
    // Check if high vulnerabilities are reviewed and mitigated/accepted
    const depSource = manifest.sources.find(s => String(s.source_type || '').toLowerCase().includes('dependency'));
    const isHighReviewed = depSource?.status === 'REVIEWED' && Boolean(manifest.known_exceptions?.length || manifest.caveats?.length);

    if (highCount > 0 && !isHighReviewed) {
      status = 'PARTIAL';
    } else if (manifest.status === 'PASS' && criticalCount === 0) {
      status = 'PASS';
    } else if (manifest.status === 'PARTIAL') {
      status = 'PARTIAL';
    } else {
      status = 'FAIL';
    }
  }

  const idempotencyKey = `security_blockers:reviewed_security:${manifest.validated_commit_sha}:${manifest.reviewed_at}`;

  const record = {
    assessment_key: 'technical_security_blockers',
    status,
    open_count: criticalCount,
    origin: 'reviewed_security',
    source_classification: 'REVIEWED_SECURITY_EVIDENCE',
    validated_commit_sha: manifest.validated_commit_sha,
    reviewer_class: manifest.reviewer_class,
    reviewed_at: manifest.reviewed_at,
    idempotency_key: idempotencyKey,
    evidence: {
      classification: 'REVIEWED_SECURITY_EVIDENCE',
      origin: 'reviewed_security',
      validated_commit_sha: manifest.validated_commit_sha,
      reviewed_at: manifest.reviewed_at,
      reviewer_class: manifest.reviewer_class,
      critical_open_count: criticalCount,
      high_open_count: highCount,
      manifest_reference: 'pl20-evidence/reviewed-security.json',
      sources: manifest.sources,
      known_exceptions: manifest.known_exceptions || [],
      caveats: manifest.caveats || []
    },
    metadata: {
      source: 'reviewed_security_manifest',
      source_type: 'reviewed_security',
      origin: 'reviewed_security',
      classification: 'REVIEWED_SECURITY_EVIDENCE',
      measured_state: 'MEASURED',
      calculation_version: 'pl20-reviewed-security-v1',
      validated_commit_sha: manifest.validated_commit_sha,
      reviewed_at: manifest.reviewed_at,
      idempotency_key: idempotencyKey,
      open_count: criticalCount
    }
  };

  return { success: true, record };
}
