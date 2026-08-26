import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';

export function useReviews(productId: string, page: number = 1, pageSize: number = 20) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['reviews', productId, page, pageSize],
    queryFn: () => apiClient.get(`/products/${productId}/reviews?page=${page}&page_size=${pageSize}`),
    enabled: !!productId
  });
}

export function useProductRating(productId: string) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['product-rating', productId],
    queryFn: () => apiClient.get(`/products/${productId}/rating`),
    enabled: !!productId
  });
}

export function useCreateReview() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { productId: string, rating: number, comment?: string }) => 
      apiClient.post(`/products/${data.productId}/reviews`, { rating: data.rating, comment: data.comment }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rating', variables.productId] });
    }
  });
}
