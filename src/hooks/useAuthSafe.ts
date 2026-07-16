import { useAuthContext } from '../contexts/AuthContext';

export function useAuthSafe() {
  const { user, token, isLoading } = useAuthContext();
  
  return {
    getToken: async () => {
      return token;
    },
    isSignedIn: !!user,
    userId: user?.id || null,
    sessionId: token,
    isLoaded: !isLoading
  };
}
