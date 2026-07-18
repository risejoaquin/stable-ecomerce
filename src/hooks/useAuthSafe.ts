export function useAuthSafe() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: 'user_mock',
    sessionId: 'session_mock',
    getToken: async () => 'mock_token'
  };
}
