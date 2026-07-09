import fs from 'fs';

let code = fs.readFileSync('src/hooks/useAdminOrders.ts', 'utf-8');

code = code.replace(
  "export function useAdminOrders() {\n  const apiClient = useApiClient();\n  return useQuery({\n    queryKey: ['admin-orders'],\n    queryFn: () => apiClient.get('/admin/orders')\n  });\n}",
  "export function useAdminOrders(filters?: { status?: string, page?: number, pageSize?: number }) {\n  const apiClient = useApiClient();\n  return useQuery({\n    queryKey: ['admin-orders', filters],\n    queryFn: () => {\n      const params = new URLSearchParams();\n      if (filters?.status) params.append('status', filters.status);\n      if (filters?.page) params.append('page', filters.page.toString());\n      if (filters?.pageSize) params.append('page_size', filters.pageSize.toString());\n      return apiClient.get(`/admin/orders?${params.toString()}`);\n    }\n  });\n}"
);

fs.writeFileSync('src/hooks/useAdminOrders.ts', code);
