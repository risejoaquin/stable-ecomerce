export function useAuthSafe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return {
    isLoaded: true,
    isSignedIn: !!token,
    userId: token ? 'user' : null,
    sessionId: token ? 'session' : null,
    getToken: async () => token
  };
}
