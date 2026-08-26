import React, { useState } from 'react';
import { useCreateReview } from '../../hooks/useReviews';
import { StarRating } from './StarRating';
import { toast } from 'react-hot-toast';

export const ReviewForm = ({ productId, themeColor }: { productId: string, themeColor: string }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const createReview = useCreateReview();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    createReview.mutate({ productId, rating, comment }, {
      onSuccess: () => {
        toast.success('Review submitted!');
        setRating(0);
        setComment('');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Failed to submit review');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-gray-900">Escribir una Reseña</h3>
      
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Calificación</label>
        <StarRating rating={rating} onChange={setRating} color={themeColor} size={24} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Comentario (Opcional)</label>
        <textarea 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          className="p-3 border border-gray-200 rounded-lg text-sm w-full min-h-[100px] focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': themeColor } as any}
        />
      </div>

      <button 
        type="submit" 
        disabled={createReview.isPending || rating === 0}
        className="px-6 py-2.5 text-white font-medium rounded-lg text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-2 self-start"
        style={{ backgroundColor: themeColor }}
      >
        {createReview.isPending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
};
