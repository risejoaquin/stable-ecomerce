import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../App';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { Check, ArrowRight } from 'lucide-react';
import { PostPurchaseNextSteps } from '../../components/conversion/PostPurchaseNextSteps';

export function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const { data: store, isLoading } = useStoreConfig();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  if (isLoading) return <div className="conversion-success-page">Cargando...</div>;

  const currentStore = store || { name: 'Selfcare Sinners', config: {} };
  const config = currentStore.config || {};
  const themeColor = config.themeColor || '#6B705C';

  return (
    <div className="conversion-success-page font-sans">
      <div className="conversion-success-card">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: themeColor + '20', color: themeColor }}>
          <Check size={40} />
        </div>
        <p className="ss-eyebrow mb-4">Compra confirmada</p>
        <h1 className="font-serif text-4xl sm:text-6xl mb-5 font-black tracking-tight text-[#181611]">Tu pedido ya está en proceso</h1>
        <p className="mx-auto mb-8 max-w-2xl text-base sm:text-lg leading-8 text-[#71695e]">
          Recibimos tu pago correctamente. Prepararemos tu pedido y te mantendremos al tanto con confirmación, seguimiento y soporte post-compra.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-white font-black shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: themeColor }}>
            Seguir comprando <ArrowRight size={18} />
          </Link>
          <Link to="/track" className="inline-flex items-center justify-center rounded-full border border-[#2c251d1f] bg-white/80 px-8 py-4 font-black text-[#181611] hover:bg-white">
            Rastrear pedido
          </Link>
        </div>
        <PostPurchaseNextSteps />
      </div>
    </div>
  );
}
