import React, { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EditorialFooter } from '../../src/components/editorial/EditorialFooter';
import {
  LazyPrivacyPolicyPage,
  LazyTermsAndConditionsPage,
  LazyDataDeletionPage,
  LazyNotFoundPage
} from '../../src/routes/lazy-routes';
import { TermsAndConditionsPage } from '../../src/pages/legal/TermsAndConditionsPage';
import { DataDeletionPage } from '../../src/pages/legal/DataDeletionPage';
import { PrivacyPolicyPage } from '../../src/pages/legal/PrivacyPolicyPage';
import fs from 'fs';
import path from 'path';

vi.mock('../../src/components/uix/UixPageShell', () => ({
  UixPageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="uix-page-shell">{children}</div>
  )
}));

vi.mock('../../src/components/SEO', () => ({
  SEO: ({ title, description, canonicalPath }: { title: string; description?: string; canonicalPath?: string }) => (
    <div data-testid="seo-meta" data-title={title} data-description={description} data-canonical={canonicalPath} />
  )
}));

describe('Legal Navigation & Shared Routing (AG-LEGAL-NAV-ROUTING)', () => {
  describe('1. EditorialFooter Navigation Links', () => {
    it('renders all canonical legal and customer links in EditorialFooter', () => {
      render(
        <MemoryRouter>
          <EditorialFooter storeName="Selfcare Sinners" />
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();

      const expectedLinks = [
        { name: 'FAQ', href: '/faq' },
        { name: 'Contacto', href: '/contact' },
        { name: 'Devoluciones', href: '/returns' },
        { name: 'Privacidad', href: '/privacy' },
        { name: 'Términos', href: '/terms' },
        { name: 'Eliminación de datos', href: '/data-deletion' }
      ];

      expectedLinks.forEach(({ name, href }) => {
        const link = screen.getByRole('link', { name });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', href);
      });
    });

    it('displays brand footer copy and copyright year', () => {
      render(
        <MemoryRouter>
          <EditorialFooter storeName="Selfcare Sinners" />
        </MemoryRouter>
      );

      const currentYear = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
      expect(screen.getByText(/Selfcare Sinners\. Skincare seleccionado con dirección editorial/i)).toBeInTheDocument();
    });
  });

  describe('2. Direct Route Resolution & Lazy Loading', () => {
    it('resolves /privacy route and renders PrivacyPolicyPage', async () => {
      render(
        <MemoryRouter initialEntries={['/privacy']}>
          <Suspense fallback={<div>Cargando...</div>}>
            <Routes>
              <Route path="/privacy" element={<LazyPrivacyPolicyPage />} />
              <Route path="*" element={<LazyNotFoundPage />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidad' })).toBeInTheDocument();
      });

      expect(screen.getByText(/Última actualización: 3 de septiembre de 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. Información que recopilamos/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Uso de la información/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Intercambio de información/i)).toBeInTheDocument();
    });

    it('resolves /terms route and renders TermsAndConditionsPage with full operational clauses', async () => {
      render(
        <MemoryRouter initialEntries={['/terms']}>
          <Suspense fallback={<div>Cargando...</div>}>
            <Routes>
              <Route path="/terms" element={<LazyTermsAndConditionsPage />} />
              <Route path="*" element={<LazyNotFoundPage />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Términos y Condiciones' })).toBeInTheDocument();
      });

      expect(screen.getByText(/Última actualización: 11 de octubre de 2026/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /1\. Aceptación de los términos y uso del sitio/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /8\. Propiedad intelectual y marcas/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /10\. Privacidad y tratamiento de datos/i })).toBeInTheDocument();
    });

    it('resolves /data-deletion route and renders DataDeletionPage with manual intake workflow', async () => {
      render(
        <MemoryRouter initialEntries={['/data-deletion']}>
          <Suspense fallback={<div>Cargando...</div>}>
            <Routes>
              <Route path="/data-deletion" element={<LazyDataDeletionPage />} />
              <Route path="*" element={<LazyNotFoundPage />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Eliminacion de datos' })).toBeInTheDocument();
      });

      expect(screen.getByText(/no ejecuta eliminaciones automaticas en produccion/i)).toBeInTheDocument();
      expect(screen.getByText(/revision manual controlada/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo electronico registrado/i)).toBeInTheDocument();
    });

    it('falls back to LazyNotFoundPage for unknown routes without crashing legal routes', async () => {
      render(
        <MemoryRouter initialEntries={['/unknown-legal-path']}>
          <Suspense fallback={<div>Cargando...</div>}>
            <Routes>
              <Route path="/privacy" element={<LazyPrivacyPolicyPage />} />
              <Route path="/terms" element={<LazyTermsAndConditionsPage />} />
              <Route path="/data-deletion" element={<LazyDataDeletionPage />} />
              <Route path="*" element={<LazyNotFoundPage />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/404/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. Cross-Linking Integrity Between Legal Pages', () => {
    it('TermsAndConditionsPage contains bidirectional hyperlinks to /privacy, /data-deletion, /returns, and /contact', () => {
      render(
        <MemoryRouter>
          <TermsAndConditionsPage />
        </MemoryRouter>
      );

      const privacyLinks = screen.getAllByRole('link', { name: /Política de Privacidad/i });
      expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
      privacyLinks.forEach(link => expect(link).toHaveAttribute('href', '/privacy'));

      const dataDeletionLinks = screen.getAllByRole('link', { name: /Eliminación de datos/i });
      expect(dataDeletionLinks.length).toBeGreaterThanOrEqual(1);
      dataDeletionLinks.forEach(link => expect(link).toHaveAttribute('href', '/data-deletion'));

      const returnLinks = screen.getAllByRole('link', { name: /Política de Devolución/i });
      expect(returnLinks.length).toBeGreaterThanOrEqual(1);
      returnLinks.forEach(link => expect(link).toHaveAttribute('href', '/returns'));

      const contactLinks = screen.getAllByRole('link', { name: /Contacto/i });
      expect(contactLinks.length).toBeGreaterThanOrEqual(1);
      contactLinks.forEach(link => expect(link).toHaveAttribute('href', '/contact'));
    });

    it('DataDeletionPage contains hyperlinks to /privacy, /terms, and /contact', () => {
      render(
        <MemoryRouter>
          <DataDeletionPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('link', { name: 'Politica de Privacidad' })).toHaveAttribute('href', '/privacy');
      expect(screen.getByRole('link', { name: 'Terminos y Condiciones' })).toHaveAttribute('href', '/terms');
      expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/contact');
    });

    it('PrivacyPolicyPage preserves existing canonical configuration', () => {
      render(
        <MemoryRouter>
          <PrivacyPolicyPage />
        </MemoryRouter>
      );

      const seo = screen.getByTestId('seo-meta');
      expect(seo).toHaveAttribute('data-title', 'Política de Privacidad');
      expect(seo).toHaveAttribute('data-canonical', '/privacy');
      expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidad' })).toBeInTheDocument();
    });
  });

  describe('4. Direct Navigation & Server Catch-All Architecture', () => {
    it('verifies server.ts includes /privacy, /terms, and /data-deletion in sitemap staticPages', () => {
      const serverCode = fs.readFileSync(path.resolve(__dirname, '../../server.ts'), 'utf-8');

      // Match staticPages definition in /sitemap.xml handler
      const sitemapMatch = serverCode.match(/const staticPages = \[(.*?)\];/s);
      expect(sitemapMatch).not.toBeNull();
      const staticPagesText = sitemapMatch![1];

      expect(staticPagesText).toContain("'/privacy'");
      expect(staticPagesText).toContain("'/terms'");
      expect(staticPagesText).toContain("'/data-deletion'");
    });

    it('verifies server.ts contains SPA wildcard catch-all route for direct navigation and F5 refresh', () => {
      const serverCode = fs.readFileSync(path.resolve(__dirname, '../../server.ts'), 'utf-8');

      // Verify app.get('*', ... res.sendFile(path.join(distPath, 'index.html')))
      expect(serverCode).toMatch(/app\.get\('\*',\s*\(_?req,\s*res\)\s*=>\s*\{[\s\S]*?res\.sendFile\(path\.join\(distPath,\s*'index\.html'\)\);[\s\S]*?\}\);/);
    });

    it('verifies App.tsx routes include /privacy, /terms, and /data-deletion with their lazy components', () => {
      const appCode = fs.readFileSync(path.resolve(__dirname, '../../src/App.tsx'), 'utf-8');

      expect(appCode).toMatch(/<Route path="\/privacy" element=\{<LazyPrivacyPolicyPage \/>\} \/>/);
      expect(appCode).toMatch(/<Route path="\/terms" element=\{<LazyTermsAndConditionsPage \/>\} \/>/);
      expect(appCode).toMatch(/<Route path="\/data-deletion" element=\{<LazyDataDeletionPage \/>\} \/>/);
    });
  });
});
