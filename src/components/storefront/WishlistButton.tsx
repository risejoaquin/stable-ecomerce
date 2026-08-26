import React from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuthSafe as useAuth } from '../../hooks/useAuthSafe';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export const WishlistButton = ({ productId, className = '' }: { productId: string, className?: string }) => {
  const { isInWishlist, addToWishlist, removeFromWishlist, isPending } = useWishlist();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const isWished = isInWishlist(productId);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSignedIn) {
      toast.error('Por favor, inicia sesión para guardar artículos en tu lista de deseos');
      // For a real Clerk setup, you might trigger a sign in modal or redirect.
      return;
    }

    if (isPending) return;

    if (isWished) {
      removeFromWishlist(productId);
      toast.success('Eliminado de la lista de deseos');
    } else {
      addToWishlist(productId);
      toast.success('Añadido a la lista de deseos');
    }
  };

  return (
    <button 
      onClick={toggleWishlist}
      className={`p-2 rounded-full transition-all hover:bg-gray-100 ${className}`}
      disabled={isPending}
      aria-label={isWished ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart 
        size={20} 
        className={`transition-colors ${isWished ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-gray-600'}`} 
      />
    </button>
  );
};
