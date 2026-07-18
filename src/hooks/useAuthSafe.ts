export function useAuthSafe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  let role = 'user';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role || 'user';
    } catch (e) {
      // ignore
    }
  }

  return {
    isLoaded: true,
    isSignedIn: !!token,
    userId: token ? 'user' : null,
    sessionId: token ? 'session' : null,
    role,
    getToken: async () => token
  };
}
