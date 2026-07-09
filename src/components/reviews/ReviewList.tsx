import React, { useState } from 'react';
import { useReviews } from '../../hooks/useReviews';
import { StarRating } from './StarRating';
import { Pagination } from '../storefront/Pagination';

export const ReviewList = ({ productId, themeColor }: { productId: string, themeColor: string }) => {
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const { data, isLoading } = useReviews(productId, page, pageSize);

  if (isLoading) return <div className="py-8 text-center text-gray-500">Loading reviews...</div>;
  if (!data?.data || data.data.length === 0) return <div className="py-8 text-center text-gray-500">No reviews yet.</div>;

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div className="flex flex-col gap-6">
      {data.data.map((review: any) => (
        <div key={review.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                  {review.user_id ? review.user_id.substring(review.user_id.length - 2).toUpperCase() : 'AN'}
               </div>
               <div>
                 <p className="text-sm font-medium text-gray-900">Verified Buyer</p>
                 <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
               </div>
            </div>
            <StarRating rating={review.rating} color={themeColor} />
          </div>
          {review.comment && (
            <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
          )}
        </div>
      ))}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} setPage={setPage} themeColor={themeColor} />
      )}
    </div>
  );
};
