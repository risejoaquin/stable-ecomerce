export function normalizeRecipientEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value?: string | null): boolean {
  const email = normalizeRecipientEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function escapeHtml(value?: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeText(value?: unknown, fallback = ''): string {
  const text = String(value ?? fallback).trim();
  return escapeHtml(text || fallback);
}

export function safeSubject(value?: unknown, fallback = 'Selfcare Sinners'): string {
  const text = String(value ?? fallback)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return (text || fallback).slice(0, 180);
}

export function safeHtmlBody(value?: unknown): string {
  const html = String(value ?? '').trim();
  if (!html) return '';
  return html;
}

export function getCanonicalAppUrl(): string {
  const raw = process.env.APP_URL || process.env.VITE_APP_URL || 'https://selfcaresinners.com';
  return String(raw).replace(/\/+$/, '');
}

export function buildAppLink(pathname: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, getCanonicalAppUrl());
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export function sanitizeEmailUrl(value?: string | null): string {
  try {
    const url = new URL(String(value || ''), getCanonicalAppUrl());
    if (!['http:', 'https:'].includes(url.protocol)) return getCanonicalAppUrl();
    return url.toString();
  } catch (_error) {
    return getCanonicalAppUrl();
  }
}
