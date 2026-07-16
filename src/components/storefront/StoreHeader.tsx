import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowLeft, LogOut } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useCart } from '../../App';
import { useStoreConfig } from '../../hooks/useStoreConfig';

export function StoreHeader({ backButton }: { backButton?: boolean }) {
  const { data: store } = useStoreConfig();
  const { user, logout } = useAuthContext();
  const { setIsCartOpen, items } = useCart();
  const navigate = useNavigate();
  
  const currentStore = store || { name: 'My Store', id: '1' };
  const config = currentStore.config || {};
  
  const themeColor = config.themeColor || '#6B705C';
  const backgroundColor = config.backgroundColor || '#F7F6F2';
  const secondaryColor = config.secondaryColor || '#A5A58D';
  
  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="min-h-20 py-4 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 border-b" style={{ borderColor: secondaryColor + '30' }}>
      {backButton ? (
        <Link to="/" className="flex items-center gap-2" style={{ color: themeColor }}>
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Store</span>
        </Link>
      ) : (
        <Link to="/" className="flex items-center">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt={currentStore.name} className="h-10 object-contain" loading="lazy" />
          ) : (
            <span className="text-2xl font-bold tracking-tight" style={{ color: themeColor }}>{currentStore.name}</span>
          )}
        </Link>
      )}
      <div className="flex items-center gap-4">
        {!user ? (
          <>
            <Link to="/login" className="px-4 py-2 font-medium transition-colors" style={{ color: themeColor }}>
              Sign In
            </Link>
            <Link to="/register" className="px-4 py-2 text-white font-medium rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: themeColor }}>
              Sign Up
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3">
             <span className="text-sm font-medium" style={{ color: themeColor }}>{user.full_name || user.email}</span>
             <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700" title="Logout">
               <LogOut size={18} />
             </button>
          </div>
        )}
        
        <Link 
          to="/wishlist" 
          className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors relative ml-2" 
          style={{ borderColor: secondaryColor + '40', backgroundColor: backgroundColor }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = secondaryColor + '10'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = backgroundColor}
        >
          <Heart size={20} style={{ color: themeColor }} />
        </Link>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors relative"
          style={{ borderColor: secondaryColor + '40', backgroundColor: backgroundColor }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = secondaryColor + '10'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = backgroundColor}
        >
          <ShoppingBag size={20} style={{ color: themeColor }} />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: config.buttonColor || themeColor }}>
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
