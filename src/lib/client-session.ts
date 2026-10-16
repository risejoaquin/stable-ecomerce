/**
 * Client-only UX hint. This decoder does NOT authenticate a JWT or verify its
 * signature. Every protected operation remains authorized by the server.
 */
export type ClientClaims = {
  exp: number;
  nbf?: number;
  userId?: string;
  sub?: string;
  role?: string;
  email?: string;
  fullName?: string;
  full_name?: string;
};

export function parseClientToken(token: string, nowMs = Date.now()): ClientClaims | null {
  if (typeof token !== 'string' || token.length > 8192) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) return null;

  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
    const json = new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(decoded, (character) => character.charCodeAt(0))
    );
    const claims: unknown = JSON.parse(json);
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return null;

    const payload = claims as Record<string, unknown>;
    const nowSeconds = Math.floor(nowMs / 1000);
    if (!Number.isSafeInteger(payload.exp) || (payload.exp as number) <= nowSeconds) return null;
    if (payload.nbf !== undefined &&
      (!Number.isSafeInteger(payload.nbf) || (payload.nbf as number) > nowSeconds)) return null;
    if (!(typeof payload.userId === 'string' && payload.userId.length > 0) &&
        !(typeof payload.sub === 'string' && payload.sub.length > 0)) return null;
    return payload as ClientClaims;
  } catch {
    return null;
  }
}

export function readClientSession(): { token: string; claims: ClientClaims } | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem('auth_token');
    if (!token) return null;
    const claims = parseClientToken(token);
    if (!claims) {
      window.localStorage.removeItem('auth_token');
      return null;
    }
    return { token, claims };
  } catch {
    return null;
  }
}
