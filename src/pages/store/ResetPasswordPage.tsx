import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';
import { UixStatePanel } from '../../components/uix/UixStatePanel';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al restablecer contraseña');

      setSuccess(true);
      toast.success('Contraseña actualizada correctamente');
      window.setTimeout(() => navigate('/'), 2200);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <UixPageShell mainClassName="uix-customer-page" data-mobile-ux-c="reset-password-invalid">
        <SEO title="Restablecer contraseña | Selfcare Sinners" />
        <div className="uix-account-centered-state">
          <UixStatePanel
            tone="error"
            title="Enlace de recuperación inválido"
            description="El enlace no contiene un token válido. Solicita uno nuevo desde el acceso a tu cuenta."
            actionText="Volver a la tienda"
            actionTo="/"
          />
        </div>
      </UixPageShell>
    );
  }

  return (
    <UixPageShell mainClassName="uix-customer-page" data-mobile-ux-c="reset-password-premium">
      <SEO title="Restablecer contraseña | Selfcare Sinners" description="Actualiza de forma segura la contraseña de tu cuenta Selfcare Sinners." />
      <section className="uix-account-auth-card" aria-labelledby="reset-password-title">
        <div className="uix-account-auth-card__visual" aria-hidden="true">
          <span className="uix-account-auth-card__icon"><KeyRound size={24} /></span>
          <p className="uix-eyebrow">Seguridad de cuenta</p>
          <h1 id="reset-password-title">Crea una nueva contraseña</h1>
          <p>Usa una contraseña que no reutilices en otros servicios. El cambio se aplicará a tu próximo acceso.</p>
          <div className="uix-account-auth-card__trust"><ShieldCheck size={17} /> Enlace de recuperación protegido</div>
        </div>

        <div className="uix-account-auth-card__form">
          {success ? (
            <div className="uix-account-success" role="status" aria-live="polite">
              <CheckCircle2 size={38} />
              <h2>Contraseña actualizada</h2>
              <p>Tu acceso quedó protegido. Te llevaremos de vuelta a la tienda para iniciar sesión.</p>
              <Link to="/" className="uix-action-primary">Volver ahora</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="uix-profile-form">
              <label>
                <span>Nueva contraseña</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              <label>
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                />
              </label>
              <button type="submit" disabled={loading} className="uix-action-primary uix-account-submit">
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </section>
    </UixPageShell>
  );
}
