import React from 'react';
import { Star } from 'lucide-react';

export const StarRating = ({ rating, size = 16, color = '#F59E0B', onChange }: { rating: number, size?: number, color?: string, onChange?: (rating: number) => void }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          disabled={!onChange}
          className={`\${onChange ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
        >
          <Star 
            size={size} 
            fill={star <= rating ? color : 'transparent'} 
            color={star <= rating ? color : '#D1D5DB'} 
          />
        </button>
      ))}
    </div>
  );
};
