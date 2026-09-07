import React from 'react';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';

const sections = [
  ['1. Información que recopilamos', 'Recopilamos la información que nos proporcionas directamente cuando creas o modificas tu cuenta, realizas una compra, solicitas soporte o te comunicas con nosotros. Esto puede incluir nombre, correo electrónico, teléfono, dirección postal, método de pago y cualquier otro dato que decidas proporcionar.'],
  ['2. Uso de la información', 'Podemos usar la información recopilada para proporcionar, mantener y mejorar nuestros servicios; procesar pagos; enviar recibos y comunicaciones relacionadas con pedidos; prestar soporte; autenticar usuarios; desarrollar funciones de seguridad y comunicar actualizaciones administrativas o del servicio.'],
  ['3. Intercambio de información', 'Podemos compartir información con proveedores que participan en la operación del servicio, por ejemplo procesamiento de pagos, correo transaccional, infraestructura y soporte. También puede existir información que decidas publicar voluntariamente en espacios públicos de nuestros servicios.'],
];

export function PrivacyPolicyPage() {
  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO title="Política de Privacidad" description="Cómo Selfcare Sinners recopila, usa y protege la información de clientes." canonicalPath="/privacy" />
      <section className="uix-customer-hero uix-legal-hero">
        <div>
          <p className="uix-eyebrow">Transparencia</p>
          <h1>Política de Privacidad</h1>
          <p>Información clara sobre los datos utilizados para operar tu cuenta, compra y soporte.</p>
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
