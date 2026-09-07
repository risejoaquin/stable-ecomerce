export type MarketingMetadata = Record<string, unknown>;

export type TrackMarketingOptions = {
  source?: string;
  dedupeTtlMs?: number;
  immediate?: boolean;
};

const SESSION_KEY = 'ss_marketing_session_id';
const DEDUPE_PREFIX = 'ss_analytics_dedupe:';
const DEFAULT_SOURCE = 'storefront';
const DEFAULT_DEDUPE_TTL_MS = 1500;
const PAGE_VIEW_DEDUPE_TTL_MS = 5 * 60 * 1000;

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const objectValue = value as Record<string, unknown>;
  return `{${Object.keys(objectValue).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`).join(',')}}`;
}

function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getMarketingSessionId(): string {
  if (!canUseBrowserStorage()) return `server-${Date.now()}`;
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    sessionId = `${Date.now()}-${randomPart}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function createMarketingEventId(eventType: string, source: string, metadata: MarketingMetadata = {}): string {
  const sessionId = getMarketingSessionId();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : 'server';
  const raw = `${sessionId}|${source}|${eventType}|${pathname}|${stableStringify(metadata)}`;
  return `${eventType}:${simpleHash(raw)}`;
}

function wasRecentlyTracked(eventId: string, ttlMs: number): boolean {
  if (!canUseBrowserStorage()) return false;
  const key = `${DEDUPE_PREFIX}${eventId}`;
  const now = Date.now();
  const previous = Number(sessionStorage.getItem(key) || '0');
  if (previous && now - previous < ttlMs) return true;
  sessionStorage.setItem(key, String(now));
  return false;
}

export function trackMarketingEvent(
  eventType: string,
  metadata: MarketingMetadata = {},
  options: TrackMarketingOptions = {}
): string | null {
  try {
    const source = options.source || (typeof metadata.source === 'string' ? metadata.source : DEFAULT_SOURCE);
    const cleanMetadata = { ...metadata };
    delete cleanMetadata.source;
    const eventId = createMarketingEventId(eventType, source, cleanMetadata);
    const ttlMs = options.dedupeTtlMs ?? DEFAULT_DEDUPE_TTL_MS;

    if (wasRecentlyTracked(eventId, ttlMs)) return null;

    const payload = {
      event_type: eventType,
      session_id: getMarketingSessionId(),
      source,
      event_id: eventId,
      dedupe_key: eventId,
      metadata: cleanMetadata
    };

    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: options.immediate !== false
    }).catch(() => undefined);

    return eventId;
  } catch (_) {
    return null;
  }
}

export function trackPageView(page: string, metadata: MarketingMetadata = {}, options: TrackMarketingOptions = {}): string | null {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : page;
  return trackMarketingEvent(
    'page_view',
    { page, pathname, ...metadata },
    { source: options.source || 'storefront_page', dedupeTtlMs: options.dedupeTtlMs ?? PAGE_VIEW_DEDUPE_TTL_MS }
  );
}
