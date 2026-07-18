export function useUserSafe() {
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
