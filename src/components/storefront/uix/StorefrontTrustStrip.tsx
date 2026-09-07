import { PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';

const items = [
  { icon: ShieldCheck, title: 'Pago seguro', copy: 'Checkout protegido y confirmación por correo.' },
  { icon: Truck, title: 'Envío claro', copy: 'Seguimiento visible desde tu cuenta.' },
  { icon: PackageCheck, title: 'Stock real', copy: 'Inventario validado antes de pagar.' },
  { icon: Sparkles, title: 'Rutinas limpias', copy: 'Productos explicados por beneficio.' },
];

export function StorefrontTrustStrip() {
  return (
    <section className="uix-trust-strip" aria-label="Beneficios de compra">
      {items.map(({ icon: Icon, title, copy }) => (
        <article key={title}>
          <Icon size={20} aria-hidden="true" />
          <strong>{title}</strong>
          <p>{copy}</p>
        </article>
      ))}
    </section>
  );
}
