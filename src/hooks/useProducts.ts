import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../api/useApiClient";

export function useProducts(storeSlug?: string) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ["products", storeSlug],
    queryFn: () => apiClient.get(`/api/products?store_slug=${storeSlug}`),
    enabled: !!storeSlug,
  });
}

export function useAdminProducts() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: ['admin-products'],
    queryFn: () => apiClient.get('/admin/products')
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  return useMutation({
    mutationFn: (newProduct: any) =>
      apiClient.post("/api/admin/products", newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });
}
