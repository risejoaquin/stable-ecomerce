import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('El enlace de verificación no incluye token.');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setStatus('success');
          window.setTimeout(() => navigate('/'), 3500);
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'No pudimos verificar tu correo.');
        }
      } catch (_) {
        setStatus('error');
        setErrorMessage('Ocurrió un error inesperado al verificar tu cuenta.');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <UixPageShell mainClassName="uix-customer-page" data-account-flow-a="verify-email-premium">
      <SEO title="Verificar correo | Selfcare Sinners" description="Confirma tu cuenta Selfcare Sinners." />
      <section className="uix-auth-result-card">
        {status === 'loading' && (
          <div className="uix-auth-result uix-auth-result--loading" role="status" aria-live="polite">
            <Loader2 className="uix-spin" size={38} aria-hidden="true" />
            <p className="uix-eyebrow">Verificación segura</p>
            <h1>Estamos confirmando tu correo</h1>
            <span>Esto solo tomará unos segundos.</span>
          </div>
        )}

        {status === 'success' && (
          <div className="uix-auth-result uix-auth-result--success" role="status" aria-live="polite">
            <CheckCircle2 size={42} aria-hidden="true" />
            <p className="uix-eyebrow">Cuenta verificada</p>
            <h1>Tu correo fue confirmado</h1>
            <span>Ya puedes iniciar sesión y usar tu perfil, pedidos y wishlist.</span>
            <Link to="/" className="uix-action-primary">Volver a la tienda</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="uix-auth-result uix-auth-result--error" role="alert">
            <XCircle size={42} aria-hidden="true" />
            <p className="uix-eyebrow">No se pudo verificar</p>
            <h1>Revisa el enlace de verificación</h1>
            <span>{errorMessage}</span>
            <Link to="/" className="uix-action-secondary">Volver a la tienda</Link>
          </div>
        )}
      </section>
    </UixPageShell>
  );
};
