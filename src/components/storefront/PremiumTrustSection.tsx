import { CreditCard, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
const items = [
  { icon: ShieldCheck, title: 'Compra segura', text: 'Pago protegido y experiencia confiable.' },
  { icon: Truck, title: 'Seguimiento claro', text: 'Tracking visible después de comprar.' },
  { icon: PackageCheck, title: 'Inventario controlado', text: 'Disponibilidad validada en el flujo.' },
  { icon: CreditCard, title: 'Checkout simple', text: 'Pago rápido con Stripe.' },
];
export function PremiumTrustSection() {
  return <section className="premium-section"><div className="premium-container premium-trust-grid">{items.map(({ icon: Icon, title, text }) => <div className="premium-trust-card" key={title}><Icon size={22} /><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-black/60">{text}</p></div>)}</div></section>;
}
