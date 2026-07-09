import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';
import { useAuthSafe as useAuth } from './useAuthSafe';

export function useWishlist() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => apiClient.get('/wishlist'),
    enabled: !!isSignedIn
  });

  const addMutation = useMutation({
    mutationFn: (productId: string) => apiClient.post('/wishlist', { product_id: productId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] })
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => apiClient.delete(`/wishlist/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] })
  });

  const isInWishlist = (productId: string) => {
    if (!query.data) return false;
    return query.data.some((item: any) => item.id === productId);
  };

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    addToWishlist: (productId: string) => addMutation.mutate(productId),
    removeFromWishlist: (productId: string) => removeMutation.mutate(productId),
    isInWishlist,
    isPending: addMutation.isPending || removeMutation.isPending
  };
}
