import { defineConfig, devices } from '@playwright/test';

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host === '::1' ||
    host === '0.0.0.0'
  );
}

function isProductionHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'selfcaresinners.com' || host === 'www.selfcaresinners.com') {
    return true;
  }
  if (
    host.startsWith('prod.') ||
    host.startsWith('prod-') ||
    host.startsWith('production.') ||
    host.startsWith('production-') ||
    host.includes('.prod.') ||
    host.includes('-prod.')
  ) {
    return true;
  }
  return false;
}

export function resolveBaseUrl(): { baseURL: string; isLocal: boolean } {
  const raw = (process.env.BASE_URL || process.env.STAGING_BASE_URL || '').trim();

  // Local default when BASE_URL is unset
  if (!raw) {
    return {
      baseURL: 'http://localhost:3000',
      isLocal: true,
    };
  }

  if (raw.includes('?') || raw.includes('#')) {
    throw new Error(
      `[playwright.config] Invalid BASE_URL: "${raw}". BASE_URL must not include query parameters or fragments.`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `[playwright.config] Invalid BASE_URL: "${raw}". BASE_URL must be a valid absolute HTTP or HTTPS URL.`
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `[playwright.config] Invalid protocol in BASE_URL: "${parsed.protocol}". Only "http:" and "https:" are allowed.`
    );
  }

  if (parsed.username || parsed.password) {
    throw new Error(
      `[playwright.config] Security violation: BASE_URL must not contain embedded user credentials.`
    );
  }

  if (parsed.pathname && parsed.pathname !== '/') {
    throw new Error(
      `[playwright.config] Invalid BASE_URL path: "${parsed.pathname}". BASE_URL must represent the host/root only.`
    );
  }

  if (isProductionHost(parsed.hostname)) {
    throw new Error(
      `[playwright.config] Production target is locked. BASE_URL "${raw}" appears to be a production endpoint. Executing automated test suites against production is strictly prohibited.`
    );
  }

  const isLocal = isLocalHost(parsed.hostname);
  const baseURL = parsed.origin;

  return { baseURL, isLocal };
}

const { baseURL, isLocal } = resolveBaseUrl();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(isLocal
    ? {
        webServer: {
          command: 'npm run start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        },
      }
    : {}),
});
