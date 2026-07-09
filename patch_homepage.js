import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

if (!code.includes('StarRating')) {
  code = `import { StarRating } from '../../components/reviews/StarRating';\n` + code;
}
if (!code.includes('useProductRating')) {
  code = `import { useProductRating } from '../../hooks/useReviews';\n` + code;
}

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

if (!code.includes('ProductRating')) {
  code += newTargetHtml;
  code = code.replace(
    `<p className="opacity-70 text-sm line-clamp-2 mb-4 flex-1"`,
    `<ProductRating productId={product.id} themeColor={themeColor} />\n        <p className="opacity-70 text-sm line-clamp-2 mb-4 flex-1"`
  );
}

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
