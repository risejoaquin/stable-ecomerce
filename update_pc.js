import fs from 'fs';
let code = fs.readFileSync('src/components/storefront/ProductCard.tsx', 'utf-8');
code = code.replace("export function ProductCard({ product }: { product: any }) {", "export const ProductCard: React.FC<{ product: any }> = ({ product }) => {");
fs.writeFileSync('src/components/storefront/ProductCard.tsx', code);
