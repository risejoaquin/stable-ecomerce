import { useAuth as useClerkAuth } from "@clerk/clerk-react";

export function useAuthSafe() {
  try {
    return useClerkAuth();
  } catch (e) {
    return { 
      getToken: async () => null, 
      isSignedIn: false, 
      userId: null, 
      sessionId: null, 
      isLoaded: true 
    };
  }
}
