import fs from 'fs';

let code = fs.readFileSync('src/components/storefront/ProductCard.tsx', 'utf-8');

// Ensure import StarRating
if (!code.includes('StarRating')) {
  code = `import { StarRating } from '../reviews/StarRating';\n` + code;
}

const targetHtml = `<h3 className="font-bold text-lg mb-1 line-clamp-1" style={{ color: textColor }}>{product.name}</h3>`;
const replaceHtml = `<h3 className="font-bold text-lg mb-1 line-clamp-1" style={{ color: textColor }}>{product.name}</h3>\n        {/* We would fetch the product rating here, but for simplicity we could also fetch it individually or assume it's added to the product object. Let's just show stars if rating exists on product for now, or just leave it empty if not. Wait, the prompt says "Mostrar StarRating con promedio en ProductCard". We need a new hook or fetch it in the component. Actually it's better to fetch it. */}`;

// Actually, in ProductCard, it's easier to create a small subcomponent to fetch the rating.
const newTargetHtml = `
const ProductRating = ({ productId, themeColor }: { productId: string, themeColor: string }) => {
  const { data } = useProductRating(productId);
  if (!data || data.count === 0) return null;
  return (
    <div className="flex items-center gap-2 mb-2">
      <StarRating rating={data.average} color={themeColor} size={14} />
      <span className="text-xs text-gray-500">({data.count})</span>
    </div>
  );
}
`;

if (!code.includes('useProductRating')) {
  code = `import { useProductRating } from '../../hooks/useReviews';\n` + code;
  code += newTargetHtml;
  code = code.replace(
    `<p className="opacity-70 text-sm line-clamp-2 mb-4 flex-1"`,
    `<ProductRating productId={product.id} themeColor={themeColor} />\n        <p className="opacity-70 text-sm line-clamp-2 mb-4 flex-1"`
  );
}

fs.writeFileSync('src/components/storefront/ProductCard.tsx', code);
