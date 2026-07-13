import { useSupabaseAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export function useAuthSafe() {
  const { user, session, isLoading } = useSupabaseAuth();
  
  return {
    getToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    },
    isSignedIn: !!user,
    userId: user?.id || null,
    sessionId: session?.access_token || null,
    isLoaded: !isLoading
  };
}
