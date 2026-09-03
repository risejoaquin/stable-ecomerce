import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';

const faqs = [
  ['¿Necesito crear cuenta para comprar?', 'No. Puedes comprar como invitado con tu correo. Si tienes cuenta, tus pedidos quedan vinculados a Mi cuenta.'],
  ['¿Cuándo se descuenta el inventario?', 'El inventario se descuenta cuando Stripe confirma el pago exitoso. Así evitamos consumir stock por carritos abandonados.'],
  ['¿Cómo rastreo mi pedido?', 'En la página Rastrear pedido usando el ID de orden y el correo usado en checkout.'],
  ['¿Puedo aplicar cupones?', 'Sí. El carrito valida cupones activos, mínimos de compra y límites de uso antes de crear la orden.'],
  ['¿Dónde están las políticas?', 'Privacidad, términos, devoluciones y contacto están visibles en el footer para que puedas revisar antes de comprar.'],
  ['¿Qué hago si mi pago fue aceptado pero no veo el pedido?', 'Contáctanos con tu correo, ID de orden o comprobante. El panel operativo registra eventos Stripe, auditoría e inventario para reconciliar rápido.'],
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
};

export function FaqPage() {
  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO title="FAQ" description="Preguntas frecuentes de compra, pagos, pedidos, rastreo y devoluciones." canonicalPath="/faq" jsonLd={faqJsonLd} />
      <section className="uix-customer-hero" data-uix-system-c="faq-hero">
        <div>
          <p className="uix-eyebrow">Ayuda</p>
          <h1>Preguntas frecuentes</h1>
          <p>Información clara para comprar, pagar, rastrear y solicitar ayuda sin fricción.</p>
        </div>
        <Link to="/contact" className="uix-action-secondary"><Mail size={16} /> Contactar soporte</Link>
      </section>
      <section className="uix-faq-grid" data-uix-system-c="faq-grid">
        {faqs.map(([q, a]) => (
          <article key={q} className="uix-faq-card">
            <h2>{q}</h2>
            <p>{a}</p>
          </article>
        ))}
      </section>
      <section className="uix-support-cta">
        <div>
          <p className="uix-eyebrow">Soporte real</p>
          <h2>¿No encontraste respuesta?</h2>
          <p>Escríbenos desde contacto y agrega tu ID de pedido si aplica.</p>
        </div>
        <Link to="/contact" className="uix-action-primary">Contactar</Link>
      </section>
    </UixPageShell>
  );
}
