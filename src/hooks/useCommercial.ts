import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useCommercialSummary() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-commercial-summary'],
    queryFn: () => apiClient.get('/admin/commercial/summary'),
    refetchInterval: 120_000
  });
}

export function useProductReadiness() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-product-readiness'],
    queryFn: () => apiClient.get('/admin/product-readiness')
  });
}

export function useAdminCampaigns() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: () => apiClient.get('/admin/campaigns')
  });
}

export function useCreateCampaign() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => apiClient.post('/admin/campaigns', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-commercial-summary'] });
    }
  });
}

export function useAdminReviews(status = 'all') {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-reviews', status],
    queryFn: () => apiClient.get(`/admin/reviews?status=${encodeURIComponent(status)}`)
  });
}

export function useModerateReview() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, moderation_status }: { id: string; moderation_status: string }) => apiClient.put(`/admin/reviews/${id}/moderation`, { moderation_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-commercial-summary'] });
    }
  });
}
