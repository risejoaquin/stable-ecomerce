import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// PL20-03J SAFE_READ capacity scale characterization harness.
// TARGET: Isolated staging ONLY (https://web-staging-production-8fb1.up.railway.app).
// STRICT SAFETY: Never target production.

const http5xxCount = new Counter('http_5xx_count');

const approvedSafeReadPaths = new Set([
  '/',
  '/api/health',
  '/api/readiness',
  '/api/public/store',
  '/api/public/home',
  '/api/public/categories',
  '/api/products',
]);

const targets = [
  '/',
  '/api/health',
  '/api/readiness',
  '/api/public/store',
  '/api/public/home',
  '/api/public/categories',
  '/api/products',
];

function requiredEnv(name) {
  const value = __ENV[name];
  if (value === undefined || String(value).trim() === '') {
    throw new Error(`${name} is required. Scale harness intentionally has no execution defaults.`);
  }
  return String(value).trim();
}

function parseApprovedVus(value) {
  if (!/^\d+$/.test(value)) {
    throw new Error('APPROVED_VUS must be an integer >= 1.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error('APPROVED_VUS must be an integer >= 1.');
  }
  return parsed;
}

function assertValidLookingDuration(value) {
  if (!/^\d+(ms|s|m|h)$/.test(value)) {
    throw new Error('APPROVED_DURATION must be a non-empty k6-style duration such as 30s, 60s, or 5m.');
  }
  return value;
}

function parseApprovedSleepSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('APPROVED_SLEEP_SECONDS must be finite and >= 0.');
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim();
  if (raw.includes('?') || raw.includes('#')) {
    throw new Error('BASE_URL must not include query parameters or fragments.');
  }

  const match = raw.match(/^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/i);
  if (!match) {
    throw new Error('BASE_URL must be a valid absolute URL representing only the host/root.');
  }

  const protocol = match[1].toLowerCase();
  const hostname = match[2].toLowerCase();
  const port = match[3] ? `:${match[3]}` : '';
  const path = (match[4] || '').replace(/\/$/, '').toLowerCase();

  const forbiddenPathParts = ['/checkout', '/orders', '/admin', '/refund', '/payment', '/webhook'];
  if (path && path !== '') {
    throw new Error('BASE_URL must represent host/root only; do not include a route path.');
  }
  const fullUrl = raw.toLowerCase();
  if (forbiddenPathParts.some((part) => fullUrl.includes(part))) {
    throw new Error('BASE_URL contains a forbidden mutation or side-effect path.');
  }

  const origin = `${protocol}://${hostname}${port}`;
  const isProduction = origin === 'https://selfcaresinners.com' || hostname === 'selfcaresinners.com' || hostname === 'www.selfcaresinners.com';
  if (isProduction && __ENV.ALLOW_PRODUCTION_LOAD_TEST !== 'true') {
    throw new Error('Production target is locked. Scale characterization is strictly forbidden against production.');
  }

  return origin;
}

function assertApprovedSafeReadTargets(paths) {
  for (const path of paths) {
    if (!approvedSafeReadPaths.has(path)) {
      throw new Error(`Unapproved target path in PL20-03J scale harness: ${path}`);
    }
  }
}

const pl20Environment = requiredEnv('PL20_ENVIRONMENT');
const pl20Stage = requiredEnv('PL20_STAGE');
const approvedVus = parseApprovedVus(requiredEnv('APPROVED_VUS'));
const approvedDuration = assertValidLookingDuration(requiredEnv('APPROVED_DURATION'));
const approvedSleepSeconds = parseApprovedSleepSeconds(requiredEnv('APPROVED_SLEEP_SECONDS'));
const baseUrl = normalizeBaseUrl(requiredEnv('BASE_URL'));

assertApprovedSafeReadTargets(targets);

export const options = {
  scenarios: {
    pl20_scale_scenario: {
      executor: 'constant-vus',
      vus: approvedVus,
      duration: approvedDuration,
    },
  },
};

export default function () {
  for (const path of targets) {
    const response = http.get(`${baseUrl}${path}`, {
      redirects: 0,
      tags: { endpoint: path, pl20_route_class: 'SAFE_READ' },
    });

    if (response.status >= 500 && response.status <= 599) {
      http5xxCount.add(1, { endpoint: path });
    }

    check(response, {
      'SAFE_READ status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
      'no redirect to mutation flow': (r) => {
        const location = String(r.headers.Location || '').toLowerCase();
        return !(
          location.includes('checkout') ||
          location.includes('admin') ||
          location.includes('orders') ||
          location.includes('payment') ||
          location.includes('refund')
        );
      },
    });

    sleep(approvedSleepSeconds);
  }
}

export function handleSummary(data) {
  const outputPath = __ENV.K6_SUMMARY_PATH || 'pl20-scale-summary.json';
  return {
    [outputPath]: JSON.stringify(data, null, 2),
    stdout: JSON.stringify({
      note: 'PL20-03J scale characterization run completed.',
      requests_total: data.metrics?.http_reqs?.values?.count ?? null,
      requests_per_second: data.metrics?.http_reqs?.values?.rate ?? null,
      error_rate: data.metrics?.http_req_failed?.values?.rate ?? null,
      p50_latency_ms: data.metrics?.http_req_duration?.values?.med ?? null,
      p95_latency_ms: data.metrics?.http_req_duration?.values?.['p(95)'] ?? null,
      p99_latency_ms: data.metrics?.http_req_duration?.values?.['p(99)'] ?? null,
      max_latency_ms: data.metrics?.http_req_duration?.values?.max ?? null,
      http_5xx_count: data.metrics?.http_5xx_count?.values?.count ?? 0,
      metadata: {
        pl20_environment: pl20Environment,
        pl20_stage: pl20Stage,
        approved_vus: approvedVus,
        approved_duration: approvedDuration,
        approved_sleep_seconds: approvedSleepSeconds,
        base_url: baseUrl,
      },
    }, null, 2),
  };
}
