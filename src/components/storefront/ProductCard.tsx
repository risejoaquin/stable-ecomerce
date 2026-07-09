import { useProductRating } from '../../hooks/useReviews';
import { StarRating } from '../reviews/StarRating';
import React from 'react';
import { useCart } from '../../App'; // Wait, let's see where useCart is

export const ProductCard: React.FC<{ product: any }> = ({ product }) => {
  const { addItem } = useCart();
  const themeColor = 'var(--theme-color)';

  return (
    <div className="bg-white border border-[#F0EFE9] rounded-3xl p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="bg-gray-100 aspect-[3/4] rounded-2xl mb-4 overflow-hidden relative">
        {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
            <div className="absolute inset-0 bg-[#B7B7A4]"></div>
        )}
      </div>
      <div className="px-2 pb-2 flex-1 flex flex-col">
        <h3 className="font-bold text-sm text-[#333]">{product.name}</h3>
        <p className="text-[#A5A58D] text-xs mt-1 mb-4">${(product.price || 0).toFixed(2)}</p>
        <div className="mt-auto">
          <button 
            onClick={() => addItem(product)}
            style={{ color: themeColor }}
            className="w-full bg-[#F7F6F2] font-bold text-xs py-2.5 rounded-xl hover:bg-[#E5E5E1] transition-colors border border-[#E5E5E1]"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

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
