import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TermsAndConditionsPage } from '../../src/pages/legal/TermsAndConditionsPage';

vi.mock('../../src/components/uix/UixPageShell', () => ({
  UixPageShell: ({ children }: { children: React.ReactNode }) => (
    <main data-testid="uix-page-shell">{children}</main>
  )
}));

vi.mock('../../src/components/SEO', () => ({
  SEO: ({ title, canonicalPath }: { title: string; canonicalPath: string }) => (
    <span data-testid="seo" data-title={title} data-canonical={canonicalPath} />
  )
}));

describe('TermsAndConditionsPage', () => {
  it('renders the page header, semantic structure, and last updated notice', () => {
    render(
      <MemoryRouter>
        <TermsAndConditionsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Términos y Condiciones' })).toBeInTheDocument();
    expect(screen.getByText(/Última actualización: 11 de octubre de 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Reglas y directrices para el uso de la tienda/i)).toBeInTheDocument();
  });

  it('covers all mandatory commercial and operational topics required by ticket META-LEGAL-001', () => {
    render(
      <MemoryRouter>
        <TermsAndConditionsPage />
      </MemoryRouter>
    );

    // 1. Acceptance and site usage
    expect(screen.getByRole('heading', { name: /1\. Aceptación de los términos y uso del sitio/i })).toBeInTheDocument();
    expect(screen.getByText(/El acceso y uso de este sitio web implican la aceptación plena/i)).toBeInTheDocument();

    // 2. User accounts and security
    expect(screen.getByRole('heading', { name: /2\. Cuentas de usuario y seguridad/i })).toBeInTheDocument();
    expect(screen.getByText(/responsabilidad del usuario salvaguardar la confidencialidad de sus credenciales/i)).toBeInTheDocument();

    // 3. Catalog, availability, prices
    expect(screen.getByRole('heading', { name: /3\. Catálogo, disponibilidad y precios/i })).toBeInTheDocument();
    expect(screen.getByText(/pesos mexicanos \(MXN\)/i)).toBeInTheDocument();

    // 4. Orders and payments
    expect(screen.getByRole('heading', { name: /4\. Pedidos y procesamiento de pagos/i })).toBeInTheDocument();
    expect(screen.getByText(/pasarelas de pago autorizadas e independientes \(como Stripe\)/i)).toBeInTheDocument();
    expect(screen.getByText(/no recopila ni almacena información completa de instrumentos de pago sensibles/i)).toBeInTheDocument();

    // 5. Shipping and delivery
    expect(screen.getByRole('heading', { name: /5\. Envíos y entrega/i })).toBeInTheDocument();
    expect(screen.getByText(/domicilio especificado por el cliente durante el proceso de compra/i)).toBeInTheDocument();

    // 6. Cancellations and returns
    expect(screen.getByRole('heading', { name: /6\. Cancelaciones y devoluciones/i })).toBeInTheDocument();

    // 7. User responsibilities and acceptable use
    expect(screen.getByRole('heading', { name: /7\. Responsabilidades del usuario y uso aceptable/i })).toBeInTheDocument();
    expect(screen.getByText(/Queda estrictamente prohibido intentar vulnerar medidas de seguridad/i)).toBeInTheDocument();

    // 8. Intellectual property
    expect(screen.getByRole('heading', { name: /8\. Propiedad intelectual y marcas/i })).toBeInTheDocument();

    // 9. Limitation of liability
    expect(screen.getByRole('heading', { name: /9\. Limitación de responsabilidad/i })).toBeInTheDocument();

    // 10. Privacy and data processing
    expect(screen.getByRole('heading', { name: /10\. Privacidad y tratamiento de datos/i })).toBeInTheDocument();

    // 11. Modifications to terms
    expect(screen.getByRole('heading', { name: /11\. Modificaciones a los términos/i })).toBeInTheDocument();

    // 12. Contact and customer support
    expect(screen.getByRole('heading', { name: /12\. Contacto y atención a clientes/i })).toBeInTheDocument();
  });

  it('contains valid hyperlinks to /privacy, /data-deletion, /returns, and /contact', () => {
    render(
      <MemoryRouter>
        <TermsAndConditionsPage />
      </MemoryRouter>
    );

    const privacyLinks = screen.getAllByRole('link', { name: /Política de Privacidad/i });
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    privacyLinks.forEach((link) => expect(link).toHaveAttribute('href', '/privacy'));

    const dataDeletionLinks = screen.getAllByRole('link', { name: /Eliminación de datos/i });
    expect(dataDeletionLinks.length).toBeGreaterThanOrEqual(1);
    dataDeletionLinks.forEach((link) => expect(link).toHaveAttribute('href', '/data-deletion'));

    const returnLinks = screen.getAllByRole('link', { name: /Política de Devolución/i });
    expect(returnLinks.length).toBeGreaterThanOrEqual(1);
    returnLinks.forEach((link) => expect(link).toHaveAttribute('href', '/returns'));

    const contactLinks = screen.getAllByRole('link', { name: /Contacto/i });
    expect(contactLinks.length).toBeGreaterThanOrEqual(1);
    contactLinks.forEach((link) => expect(link).toHaveAttribute('href', '/contact'));
  });

  it('treats BLACK RELIC strictly as a brand/trademark and does not claim legal entity status', () => {
    render(
      <MemoryRouter>
        <TermsAndConditionsPage />
      </MemoryRouter>
    );

    // Confirms brand reference exists
    expect(screen.getByText(/marca BLACK RELIC/i)).toBeInTheDocument();

    // Asserts no false legal entity claims per ADR-2026-10-11
    expect(screen.queryByText(/BLACK RELIC.*entidad legal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/BLACK RELIC.*sociedad anónima/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/razón social BLACK RELIC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RFC de BLACK RELIC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/S\.A\. de C\.V\./i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Insurgentes Sur/i)).not.toBeInTheDocument();
  });
});
