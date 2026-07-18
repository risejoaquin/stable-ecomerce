import { useQuery } from '@tanstack/react-query';

export function useUserSafe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user', token],
    queryFn: async () => {
      if (!token) return null;
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    },
    enabled: !!token,
    retry: false
  });

  if (!token) {
    return {
      user: null,
      isLoaded: true,
      isSignedIn: false
    };
  }

  if (isLoading) {
    return {
      user: null,
      isLoaded: false,
      isSignedIn: false
    };
  }

  if (isError || !user) {
    return {
      user: null,
      isLoaded: true,
      isSignedIn: false
    };
  }

  return {
    user: {
      id: user.id,
      primaryEmailAddress: { emailAddress: user.email },
      fullName: user.full_name || 'User',
      imageUrl: ''
    },
    isLoaded: true,
    isSignedIn: true
  };
}
