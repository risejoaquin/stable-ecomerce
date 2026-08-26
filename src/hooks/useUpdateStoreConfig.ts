import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useUpdateStoreConfig() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: any) => apiClient.put('/admin/store/config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin-store'] });
    }
  });
}
