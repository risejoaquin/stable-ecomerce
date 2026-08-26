import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../App';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { toast } from 'react-hot-toast';

export function RecoverCartPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { setItems } = useCart();
  const [status, setStatus] = useState('Recovering your cart...');
  const { data: store } = useStoreConfig();
  const themeColor = store?.config?.themeColor || '#6B705C';

  useEffect(() => {
    if (!token) {
      setStatus('Invalid recovery link.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    fetch(`/api/cart/recover?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setItems(data.items);
          setStatus('Cart recovered successfully! Redirecting...');
          setTimeout(() => navigate('/'), 1500);
        } else {
          setStatus('Failed to recover cart.');
        }
      })
      .catch(err => {
        console.error(err);
        setStatus('Error al recuperar el carrito.');
        toast.error('Error al recuperar el carrito.');
      });
  }, [token, navigate, setItems]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full mx-4">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: themeColor + '20' }}>
          <div className="w-8 h-8 rounded-full" style={{ backgroundColor: themeColor, animation: 'pulse 1.5s infinite' }} />
        </div>
        <h1 className="text-2xl font-bold font-serif mb-2">Restoring Cart</h1>
        <p className="text-gray-500">{status}</p>
      </div>
    </div>
  );
}
