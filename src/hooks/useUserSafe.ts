import { useUser as useClerkUser } from "@clerk/clerk-react";

export function useUserSafe() {
  try {
    return useClerkUser();
  } catch (e) {
    return {
      user: {
        id: 'user_mock',
        primaryEmailAddress: { emailAddress: 'admin@example.com' },
        fullName: 'Local Admin',
        imageUrl: ''
      },
      isLoaded: true,
      isSignedIn: true
    };
  }
}
