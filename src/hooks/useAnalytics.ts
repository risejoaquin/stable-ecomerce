import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useAdminSales() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-analytics-sales'],
    queryFn: () => apiClient.get('/admin/analytics/sales')
  });
}

export function useTopProducts() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-analytics-top-products'],
    queryFn: () => apiClient.get('/admin/analytics/top_products')
  });
}

export function useRecentOrders() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-analytics-recent-orders'],
    queryFn: () => apiClient.get('/admin/analytics/recent_orders')
  });
}
