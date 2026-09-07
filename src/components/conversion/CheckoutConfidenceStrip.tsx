import React from 'react';
import { CreditCard, RotateCcw, ShieldCheck } from 'lucide-react';

export function CheckoutConfidenceStrip() {
  return (
    <div className="checkout-trust-strip" aria-label="Confianza de compra">
      <span><ShieldCheck size={15} /> Pago seguro</span>
      <span><CreditCard size={15} /> Stripe checkout</span>
      <span><RotateCcw size={15} /> Soporte post-compra</span>
    </div>
  );
}
