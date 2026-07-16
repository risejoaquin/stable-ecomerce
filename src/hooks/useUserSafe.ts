import { useAuthContext } from '../contexts/AuthContext';

export function useUserSafe() {
  const { user, isLoading } = useAuthContext();
  
  return {
    user,
    isLoaded: !isLoading,
    isSignedIn: !!user
  };
}
