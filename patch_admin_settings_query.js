import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminSettingsPage.tsx', 'utf-8');
code = code.replace(
  `queryKey: ['public-store']`,
  `queryKey: ['store-config']`
);
code = code.replace(
  `queryClient.invalidateQueries({ queryKey: ['public-store'] });`,
  `queryClient.invalidateQueries({ queryKey: ['store-config'] });\n      queryClient.invalidateQueries({ queryKey: ['admin-store'] });`
);
code = code.replace(
  `queryFn: () => apiClient.get('/public/store'),`,
  `queryFn: async () => { const data = await apiClient.get('/public/store'); return data.store || data; },`
);
code = code.replace(
  `if (store?.store?.config) {`,
  `if (store?.config) {`
);
code = code.replace(
  `setConfig((prev: any) => ({ ...prev, ...store.store.config }));`,
  `setConfig((prev: any) => ({ ...prev, ...store.config }));`
);
fs.writeFileSync('src/pages/admin/AdminSettingsPage.tsx', code);
