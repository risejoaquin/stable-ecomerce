import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ShoppingBag, XCircle } from 'lucide-react';
import { useCart } from '../../App';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';

export function RecoverCartPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { setItems } = useCart();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Estamos recuperando los productos que dejaste en tu carrito.');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El enlace de recuperación no es válido o está incompleto.');
      return;
    }

    let active = true;
    fetch(`/api/cart/recover?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No pudimos recuperar tu carrito.');
        return data;
      })
      .then(data => {
        if (!active) return;
        if (Array.isArray(data.items)) {
          setItems(data.items);
          setStatus('success');
          setMessage('Tu carrito fue recuperado. Te llevaremos a la tienda para continuar tu compra.');
          window.setTimeout(() => navigate('/'), 1800);
        } else {
          setStatus('error');
          setMessage('No encontramos productos disponibles para recuperar con este enlace.');
        }
      })
      .catch((err: any) => {
        if (!active) return;
        console.error(err);
        setStatus('error');
        setMessage(err.message || 'Ocurrió un error al recuperar tu carrito.');
      });

    return () => { active = false; };
  }, [token, navigate, setItems]);

  return (
    <UixPageShell mainClassName="uix-customer-page" data-mobile-ux-c="recover-cart-premium">
      <SEO title="Recuperar carrito | Selfcare Sinners" description="Recupera de forma segura tu carrito Selfcare Sinners." />
      <section className="uix-auth-result-card">
        <div className={`uix-auth-result uix-auth-result--${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">
          {status === 'loading' && <Loader2 className="uix-spin" size={40} aria-hidden="true" />}
          {status === 'success' && <CheckCircle2 size={42} aria-hidden="true" />}
          {status === 'error' && <XCircle size={42} aria-hidden="true" />}
          <p className="uix-eyebrow">Carrito guardado</p>
          <h1>{status === 'loading' ? 'Recuperando tu carrito' : status === 'success' ? 'Tu carrito está listo' : 'No pudimos recuperar tu carrito'}</h1>
          <span>{message}</span>
          {status === 'error' && <Link to="/" className="uix-action-secondary"><ShoppingBag size={16} /> Volver a la tienda</Link>}
        </div>
      </section>
    </UixPageShell>
  );
}
