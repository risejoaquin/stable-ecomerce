import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, PackageCheck } from 'lucide-react';
import { useCart } from '../../App';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { PostPurchaseNextSteps } from '../../components/conversion/PostPurchaseNextSteps';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';
import { UixStatePanel } from '../../components/uix/UixStatePanel';

export function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { data: store, isLoading } = useStoreConfig();

  useEffect(() => { clearCart(); }, [clearCart]);

  if (isLoading) {
    return <UixPageShell mainClassName="uix-customer-page"><UixStatePanel tone="loading" title="Confirmando tu compra" description="Estamos preparando la información posterior al pago." /></UixPageShell>;
  }

  const currentStore = store || { name: 'Selfcare Sinners', config: {} };

  return (
    <UixPageShell mainClassName="uix-customer-page" data-mobile-ux-c="checkout-success-premium" data-mobile-ux-e="checkout-success-flow">
      <SEO title="Compra confirmada | Selfcare Sinners" description="Tu pedido Selfcare Sinners fue confirmado correctamente." />
      <section className="uix-checkout-success" role="status" aria-live="polite">
        <div className="uix-checkout-success__mark"><CheckCircle2 size={38} aria-hidden="true" /></div>
        <p className="uix-eyebrow">{currentStore.name}</p>
        <h1>Tu pedido ya está en proceso</h1>
        <p>Recibimos tu pago correctamente. Prepararemos tu pedido y te mantendremos al tanto con confirmación, seguimiento y soporte post-compra.</p>
        {sessionId && <p className="uix-checkout-success__reference">Referencia de pago disponible para soporte.</p>}
        <div className="uix-checkout-success__actions">
          <Link to="/" className="uix-action-primary">Seguir comprando <ArrowRight size={18} /></Link>
          <Link to="/track" className="uix-action-secondary"><PackageCheck size={18} /> Rastrear pedido</Link>
        </div>
        <div className="uix-checkout-success__next"><PostPurchaseNextSteps /></div>
      </section>
    </UixPageShell>
  );
}
