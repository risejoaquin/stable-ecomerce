import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../App';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { Check } from 'lucide-react';

export function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const { data: store, isLoading } = useStoreConfig();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const currentStore = store || { name: 'Store', config: {} };
  const config = currentStore.config || {};
  
  const themeColor = config.themeColor || '#6B705C';
  const secondaryColor = config.secondaryColor || '#A5A58D';
  const backgroundColor = config.backgroundColor || '#FDFCFB';
  const textColor = config.textColor || '#333333';
  const fontFamily = config.fontFamily === 'Playfair Display' ? '"Playfair Display", serif' : 
                     config.fontFamily === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : 
                     '"Inter", sans-serif';
  const borderRadius = config.borderRadius === 'none' ? '0px' : config.borderRadius === 'sm' ? '4px' : config.borderRadius === 'md' ? '8px' : config.borderRadius === 'lg' ? '16px' : config.borderRadius === 'xl' ? '24px' : '9999px';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-sans" style={{ 
      backgroundColor, 
      color: textColor,
      fontFamily 
    }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 shadow-sm" style={{ backgroundColor: themeColor + '20', color: themeColor }}>
        <Check size={40} />
      </div>
      <h1 className="font-serif text-4xl mb-4 font-bold tracking-tight text-center px-4">{config.heroBanner?.title ? 'Thank you for your order!' : 'Order Confirmed'}</h1>
      <p className="mb-10 text-lg opacity-80 text-center px-4 max-w-md" style={{ color: secondaryColor }}>
        We've received your payment and will begin processing your order right away.
      </p>
      <Link 
        to="/" 
        className="px-8 py-3 text-white font-medium hover:opacity-90 transition-opacity"
        style={{ 
          backgroundColor: themeColor,
          borderRadius
        }}
      >
        Continue Shopping
      </Link>
    </div>
  );
}
