import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useValidateCoupon() {
  const apiClient = useApiClient();
  return useMutation({
    mutationFn: (data: { code: string, storeId: string, orderTotal: number }) => 
      apiClient.post(`/coupons/validate`, data)
  });
}

export function useAdminCoupons() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => apiClient.get('/admin/coupons')
  });
}

export function useCreateCoupon() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/admin/coupons', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
  });
}

export function useDeleteCoupon() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/coupons/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
  });
}
