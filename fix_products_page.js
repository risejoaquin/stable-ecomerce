import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/ProductsPage.tsx', 'utf-8');

code = code.replace("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';", "import { useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useAdminProducts } from '../../hooks/useProducts';");
code = code.replace("const { data: products, isLoading } = useQuery({\n    queryKey: ['admin-products'],\n    queryFn: () => apiClient.get('/admin/products')\n  });", "const { data: products, isLoading } = useAdminProducts();");

fs.writeFileSync('src/pages/admin/ProductsPage.tsx', code);
