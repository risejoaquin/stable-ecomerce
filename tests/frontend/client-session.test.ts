// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseClientToken, readClientSession } from '../../src/lib/client-session';
import { useAuthSafe } from '../../src/hooks/useAuthSafe';
import { useUserSafe } from '../../src/hooks/useUserSafe';

const now = Date.UTC(2026, 9, 15, 12, 0, 0);
const buildToken = (claims: Record<string, unknown>) => {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${encodedHeader}.${encodedPayload}.synthetic-signature`;
};

afterEach(() => vi.unstubAllGlobals());

describe('client JWT expiry guard (UI only; backend verifies signature)', () => {
  it('decodes UTF-8 Base64URL claims with valid expiry', () => {
    const token = buildToken({ userId: 'user-123', role: 'admin', fullName: 'José', exp: now / 1000 + 300 });
    expect(parseClientToken(token, now)).toMatchObject({ userId: 'user-123', fullName: 'José' });
  });

  it('rejects expired, boundary-expired, missing expiry, not-yet-valid and malformed tokens', () => {
    const base = { userId: 'user-123' };
    for (const exp of [now / 1000 - 1, now / 1000, undefined, '9999999999']) {
      expect(parseClientToken(buildToken({ ...base, exp }), now)).toBeNull();
    }
    expect(parseClientToken(buildToken({ ...base, exp: now / 1000 + 300, nbf: now / 1000 + 1 }), now)).toBeNull();
    expect(parseClientToken(buildToken({ exp: now / 1000 + 300 }), now)).toBeNull();
    expect(parseClientToken('bad-token', now)).toBeNull();
    expect(parseClientToken('a.bad*b.payload', now)).toBeNull();
  });

  it('removes expired tokens and signs both UI hooks out consistently', () => {
    let stored: string | null = buildToken({ userId: 'expired', role: 'admin', exp: 1 });
    const removeItem = vi.fn(() => { stored = null; });
    vi.stubGlobal('window', { localStorage: {
      getItem: () => stored,
      removeItem
    } });

    expect(readClientSession()).toBeNull();
    expect(removeItem).toHaveBeenCalledWith('auth_token');
    expect(useAuthSafe().isSignedIn).toBe(false);
    expect(useUserSafe().isSignedIn).toBe(false);
    expect(useUserSafe().user).toBeNull();
  });

  it('rechecks expiry at getToken time instead of returning a captured token', async () => {
    let stored: string | null = buildToken({ userId: 'user-123', role: 'user', exp: Math.floor(Date.now() / 1000) + 600 });
    vi.stubGlobal('window', { localStorage: {
      getItem: () => stored,
      removeItem: () => { stored = null; }
    } });
    const auth = useAuthSafe();
    expect(auth.isSignedIn).toBe(true);
    stored = buildToken({ userId: 'user-123', role: 'user', exp: 1 });
    expect(await auth.getToken()).toBeNull();
  });
});
