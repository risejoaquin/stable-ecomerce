import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api/useApiClient";

export function useAdminOrders(filters?: { status?: string, page?: number, pageSize?: number }) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.pageSize) params.append('page_size', filters.pageSize.toString());
      return apiClient.get(`/admin/orders?${params.toString()}`);
    }
  });
}

export function useAdminOrder(id: string) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => apiClient.get(`/admin/orders/${id}`),
    enabled: !!id
  });
}

export function useUpdateOrderStatus(id: string) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (status: string) => apiClient.put(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
    }
  });
}

export function useRefundOrder(id: string) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data?: { amount?: number | string, reason?: string, restock?: boolean }) => apiClient.post(`/admin/orders/${id}/refund`, data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-operations-summary'] });
    }
  });
}

export function useResendOrderConfirmation(id: string) {
  const apiClient = useApiClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/admin/orders/${id}/resend-confirmation`, {})
  });
}

export function useUpdateOrderTracking(id: string) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { tracking_number: string, notes: string }) => apiClient.put(`/admin/orders/${id}/tracking`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
    }
  });
}
