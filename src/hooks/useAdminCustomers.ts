import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useAdminCustomers() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => apiClient.get('/admin/customers')
  });
}
