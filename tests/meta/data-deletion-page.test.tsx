import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataDeletionPage } from '../../src/pages/legal/DataDeletionPage';

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

describe('DataDeletionPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('documents a manual, non-automatic data deletion procedure for Meta readiness', () => {
    render(
      <MemoryRouter>
        <DataDeletionPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Eliminacion de datos' })).toBeInTheDocument();
    expect(screen.getByText(/no ejecuta eliminaciones automaticas en produccion/i)).toBeInTheDocument();
    expect(screen.getByText(/revision manual controlada/i)).toBeInTheDocument();
    expect(screen.getByText(/integraciones de medicion con Meta/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Politica de Privacidad' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terminos y Condiciones' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contact');
  });

  it('does not present BLACK RELIC as a legal entity', () => {
    render(
      <MemoryRouter>
        <DataDeletionPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/BLACK RELIC.*entidad legal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/razon social BLACK RELIC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RFC de BLACK RELIC/i)).not.toBeInTheDocument();
  });

  it('renders the interactive manual intake form with security notices', () => {
    render(
      <MemoryRouter>
        <DataDeletionPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Correo electronico registrado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Referencia o ID de pedido/i)).toBeInTheDocument();
    expect(screen.getByText(/Categorias solicitadas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Datos de cuenta y perfil/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Detalles adicionales/i)).toBeInTheDocument();
    expect(screen.getByText(/Aviso de seguridad: No incluyas contrasenas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar solicitud para revision manual/i })).toBeInTheDocument();
  });

  it('submits manual request and renders confirmation folio without automatic deletion', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        status: 'accepted_for_manual_review',
        requestId: 'test-req-uuid-1234',
        automatedDeletion: false,
        stored: false,
        nextStep: 'The request must be reviewed manually before any deletion or anonymization action.'
      })
    });
    global.fetch = fetchMock;

    render(
      <MemoryRouter>
        <DataDeletionPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Correo electronico registrado/i), {
      target: { value: 'user@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/Referencia o ID de pedido/i), {
      target: { value: 'ss-ord-9988' }
    });
    fireEvent.change(screen.getByLabelText(/Detalles adicionales/i), {
      target: { value: 'Solicito anonimizar mi perfil.' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud para revision manual/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/privacy/data-deletion-request',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@example.com',
            orderReference: 'ss-ord-9988',
            requestTypes: ['account'],
            details: 'Solicito anonimizar mi perfil.'
          })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('data-deletion-success')).toBeInTheDocument();
      expect(screen.getByText(/Folio de seguimiento:/i)).toBeInTheDocument();
      expect(screen.getByText('test-req-uuid-1234')).toBeInTheDocument();
      expect(screen.getByText(/No se ha ejecutado ninguna eliminacion automatica de datos/i)).toBeInTheDocument();
    });

    // Reset button returns back to empty form
    fireEvent.click(screen.getByRole('button', { name: /Registrar otra solicitud/i }));
    expect(screen.queryByTestId('data-deletion-success')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electronico registrado/i)).toBeInTheDocument();
  });

  it('displays sanitized error message when intake endpoint fails without leaking stack traces', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal_server_error' })
    });
    global.fetch = fetchMock;

    render(
      <MemoryRouter>
        <DataDeletionPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Correo electronico registrado/i), {
      target: { value: 'user@example.com' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud para revision manual/i }));

    await waitFor(() => {
      expect(screen.getByTestId('data-deletion-error')).toBeInTheDocument();
      expect(screen.getByText(/No pudimos procesar tu solicitud en este momento/i)).toBeInTheDocument();
    });
    // Ensure no stack traces or server internals in DOM
    expect(screen.queryByText(/Error:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/at /i)).not.toBeInTheDocument();
  });
});
