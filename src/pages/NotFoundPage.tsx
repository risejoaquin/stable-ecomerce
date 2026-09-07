import React from 'react';
import { SEO } from '../components/SEO';
import { UixPageShell } from '../components/uix/UixPageShell';
import { UixStatePanel } from '../components/uix/UixStatePanel';

export function NotFoundPage() {
  return (
    <UixPageShell mainClassName="uix-customer-page uix-not-found-page">
      <SEO title="Página no encontrada" description="La página que buscas no está disponible en Selfcare Sinners." />
      <section className="uix-customer-hero">
        <div>
          <p className="uix-eyebrow">Error 404</p>
          <h1>Esta página ya no está aquí</h1>
          <p>El enlace pudo cambiar o el contenido dejó de estar disponible. Puedes volver a la tienda y continuar explorando tu rutina.</p>
        </div>
      </section>
      <UixStatePanel tone="empty" title="No encontramos esta página" description="Vuelve al storefront para continuar navegando productos, rutinas y ayuda." actionText="Volver a la tienda" actionTo="/" />
    </UixPageShell>
  );
}
