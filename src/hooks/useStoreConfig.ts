import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useStoreConfig(slug?: string) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['store-config', slug],
    queryFn: async () => {
      const data = slug ? await apiClient.get(`/public/store/${slug}`) : await apiClient.get('/public/store');
      return data.store || data; // handle both shapes
    }
  });
}
