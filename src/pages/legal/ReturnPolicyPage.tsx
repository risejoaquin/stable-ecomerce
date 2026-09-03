import React from 'react';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';

const sections = [
  ['Devoluciones', 'Tienes 30 días naturales desde la recepción del producto para solicitar una devolución. Para ser elegible, el artículo debe estar sin uso, en las mismas condiciones en que lo recibiste, conservar su empaque original y contar con recibo o comprobante de compra.'],
  ['Reembolsos', 'Cuando recibamos el artículo devuelto lo revisaremos y te informaremos el estado de la solicitud. Si la devolución es aprobada, iniciaremos el reembolso al mismo método de pago utilizado en la compra.'],
  ['Envíos de devolución', 'El costo de envío para devolver el artículo corre por cuenta del cliente y no es reembolsable. Cuando corresponda, el costo del envío de devolución podrá descontarse del monto final del reembolso.'],
];

export function ReturnPolicyPage() {
  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO title="Política de Devolución" description="Condiciones de devoluciones y reembolsos de Selfcare Sinners." canonicalPath="/returns" />
      <section className="uix-customer-hero uix-legal-hero">
        <div>
          <p className="uix-eyebrow">Compra con claridad</p>
          <h1>Política de Devolución</h1>
          <p>Condiciones simples para solicitar una devolución y conocer el proceso de reembolso.</p>
        </div>
      </section>
      <section className="uix-legal-stack">
        {sections.map(([title, body]) => (
          <article key={title} className="uix-legal-card">
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </UixPageShell>
  );
}
