import { useSupabaseAuth } from '../contexts/AuthContext';

export function useUserSafe() {
  const { user, isLoading } = useSupabaseAuth();
  
  if (!user) {
    return {
      user: null,
      isLoaded: !isLoading,
      isSignedIn: false
    };
  }

  return {
    user: {
      id: user.id,
      primaryEmailAddress: { emailAddress: user.email },
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0],
      imageUrl: user.user_metadata?.avatar_url || ''
    },
    isLoaded: !isLoading,
    isSignedIn: true
  };
}
