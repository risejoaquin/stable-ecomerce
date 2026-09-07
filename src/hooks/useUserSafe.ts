export function useUserSafe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  let role = 'guest';
  let userId: string | null = null;
  let email: string | null = null;
  let fullName: string | null = null;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      role = payload.role === 'admin' ? 'admin' : 'user';
      userId = payload.userId || payload.sub || 'user';
      email = payload.email || null;
      fullName = payload.fullName || payload.full_name || null;
    } catch (_) {
      role = 'user';
      userId = 'user';
    }
  }

  return {
    user: token
      ? {
          id: userId || 'user',
          role,
          primaryEmailAddress: { emailAddress: email || '' },
          fullName: fullName || (role === 'admin' ? 'Administrador' : 'Cliente'),
          imageUrl: ''
        }
      : null,
    isLoaded: true,
    isSignedIn: Boolean(token),
    role
  };
}
