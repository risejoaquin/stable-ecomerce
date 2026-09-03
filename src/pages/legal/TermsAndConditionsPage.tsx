import React from 'react';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';

const sections = [
  ['1. Aceptación de los términos', 'Al acceder y utilizar este sitio aceptas quedar sujeto a estos términos y condiciones, así como a las reglas específicas aplicables a los servicios disponibles en la tienda.'],
  ['2. Prestación de servicios', 'Selfcare Sinners puede modificar, mejorar o descontinuar funciones o servicios cuando sea necesario para operar la tienda, mantener su seguridad o evolucionar la experiencia de compra.'],
  ['3. Propiedad intelectual', 'El sitio puede contener marcas, contenidos, diseños y otros materiales protegidos por las leyes de propiedad intelectual aplicables. Su disponibilidad en el sitio no concede derechos de reproducción o explotación fuera de los usos permitidos.'],
];

export function TermsAndConditionsPage() {
  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO title="Términos y Condiciones" description="Términos de uso del ecommerce Selfcare Sinners." canonicalPath="/terms" />
      <section className="uix-customer-hero uix-legal-hero">
        <div>
          <p className="uix-eyebrow">Condiciones de uso</p>
          <h1>Términos y Condiciones</h1>
          <p>Las reglas esenciales para utilizar la tienda y sus servicios de forma clara y segura.</p>
        </div>
        <span className="uix-legal-updated">Última actualización: 3 de septiembre de 2026</span>
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
