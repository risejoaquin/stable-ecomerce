import { readClientSession } from '../lib/client-session';

export function useUserSafe() {
  const session = readClientSession();
  const claims = session?.claims;
  const role = !claims ? 'guest' : claims.role === 'admin' ? 'admin' : 'user';
  const userId = claims?.userId || claims?.sub || null;
  const email = typeof claims?.email === 'string' ? claims.email : null;
  const fullName = typeof claims?.fullName === 'string'
    ? claims.fullName
    : typeof claims?.full_name === 'string' ? claims.full_name : null;

  return {
    user: session
      ? {
          id: userId || 'user',
          role,
          primaryEmailAddress: { emailAddress: email || '' },
          fullName: fullName || (role === 'admin' ? 'Administrador' : 'Cliente'),
          imageUrl: ''
        }
      : null,
    isLoaded: true,
    isSignedIn: Boolean(session),
    role
  };
}
