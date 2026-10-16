import { readClientSession } from '../lib/client-session';

export function useAuthSafe() {
  const session = readClientSession();
  return {
    isLoaded: true,
    isSignedIn: Boolean(session),
    userId: session?.claims.userId || session?.claims.sub || null,
    sessionId: session ? 'session' : null,
    role: typeof session?.claims.role === 'string' ? session.claims.role : 'user',
    // Resolve afresh so an expired token is not returned by a stale callback.
    getToken: async () => readClientSession()?.token || null
  };
}
