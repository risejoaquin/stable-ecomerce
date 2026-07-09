import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../api/useApiClient";

export function useSearchProducts(storeSlug?: string, filters?: any) {
  const apiClient = useApiClient();
  
  return useQuery({
    queryKey: ["products", storeSlug, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (storeSlug) params.append('store_slug', storeSlug);
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.minPrice) params.append('min_price', filters.minPrice);
      if (filters?.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters?.sortBy) params.append('sort_by', filters.sortBy);
      if (filters?.order) params.append('order', filters.order);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.pageSize) params.append('page_size', filters.pageSize.toString());
      
      return apiClient.get(`/products?${params.toString()}`);
    },
    enabled: !!storeSlug,
  });
}
