import fs from 'fs';

let code = fs.readFileSync('src/pages/store/ProductDetailPage.tsx', 'utf-8');

if (!code.includes('ReviewList')) {
  code = `import { ReviewList } from '../../components/reviews/ReviewList';\n` + code;
  code = `import { ReviewForm } from '../../components/reviews/ReviewForm';\n` + code;
  code = `import { StarRating } from '../../components/reviews/StarRating';\n` + code;
  code = `import { useProductRating } from '../../hooks/useReviews';\n` + code;
  code = `import { useAuth } from '@clerk/clerk-react';\n` + code;
}

const productRatingBlock = `
  const { data: ratingData } = useProductRating(productId || '');
  const { isSignedIn } = useAuth();
`;

code = code.replace(
  `const { data: product, isLoading } = useQuery({`,
  productRatingBlock + `\n  const { data: product, isLoading } = useQuery({`
);

const renderRating = `
              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <StarRating rating={ratingData.average} color={themeColor} size={20} />
                  <span className="text-sm font-medium" style={{ color: secondaryColor }}>{ratingData.average.toFixed(1)} ({ratingData.count} reviews)</span>
                </div>
              )}
`;

code = code.replace(
  `<div className="text-3xl font-bold mb-8" style={{ color: themeColor }}>`,
  renderRating + `\n              <div className="text-3xl font-bold mb-8" style={{ color: themeColor }}>`
);

const reviewsSection = `
        {/* Reviews Section */}
        <div className="mt-20 border-t pt-12" style={{ borderColor: secondaryColor + '30' }}>
          <h2 className="text-2xl font-bold mb-8" style={{ color: textColor }}>Customer Reviews</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <ReviewList productId={productId || ''} themeColor={themeColor} />
            </div>
            <div>
              {isSignedIn ? (
                <ReviewForm productId={productId || ''} themeColor={themeColor} />
              ) : (
                <div className="p-6 rounded-xl border bg-gray-50 text-center">
                  <p className="text-gray-600 mb-4">Please sign in to write a review.</p>
                </div>
              )}
            </div>
          </div>
        </div>
`;

code = code.replace(
  `</main>`,
  reviewsSection + `\n      </main>`
);

fs.writeFileSync('src/pages/store/ProductDetailPage.tsx', code);
