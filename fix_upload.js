import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  /'Authorization': \`Bearer \$\{await \(window as any\)\.getAuthToken\?\.\(\) \|\| ''\}\`/,
  "'Authorization': `Bearer ${await getToken() || ''}`"
);
content = content.replace(/function ProductFormModal[^{]*\{/g, "function ProductFormModal({ product, onClose }: { product: any, onClose: () => void }) {\n  const { getToken } = useAuth();\n  const apiClient = useApiClient();");
fs.writeFileSync('src/App.tsx', content);
