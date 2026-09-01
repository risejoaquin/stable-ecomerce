import React from 'react';

type TrustSignal = {
  title: string;
  description: string;
};

const defaultSignals: TrustSignal[] = [
  { title: 'Pago seguro', description: 'Checkout protegido con Stripe.' },
  { title: 'Soporte claro', description: 'Ayuda visible antes y después de comprar.' },
  { title: 'Tracking disponible', description: 'Seguimiento de pedido después del pago.' },
];

export function UXTrustStrip({ signals = defaultSignals }: { signals?: TrustSignal[] }) {
  return (
    <section className="ux-trust-strip" aria-label="Señales de confianza de compra">
      {signals.map((signal) => (
        <article className="ux-trust-card" key={signal.title}>
          <strong>{signal.title}</strong>
          <span>{signal.description}</span>
        </article>
      ))}
    </section>
  );
}

export function UXLoadingState({ label = 'Cargando experiencia...' }: { label?: string }) {
  return (
    <div className="ux-state-card" role="status" aria-live="polite">
      <div className="ux-skeleton-line" />
      <div className="ux-skeleton-line short" />
      <p>{label}</p>
    </div>
  );
}

export function UXEmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="ux-state-card" role="status">
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div className="ux-state-action">{action}</div> : null}
    </div>
  );
}

export function UXErrorState({ title = 'No pudimos cargar esta sección', description = 'Intenta de nuevo o contacta soporte si el problema continúa.' }) {
  return (
    <div className="ux-state-card error" role="alert">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function MobileCheckoutConfidence() {
  return (
    <aside className="mobile-checkout-confidence" aria-label="Confianza de checkout">
      <span>Pago seguro</span>
      <span>Recibo por email</span>
      <span>Tracking disponible</span>
    </aside>
  );
}
