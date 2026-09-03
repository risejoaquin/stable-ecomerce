import React, { useState } from 'react';
import { useAuthSafe } from '../hooks/useAuthSafe';
import { AccountMenu } from './account/AccountMenu';
import { openAuthDialog, setAuthModalOpener, type AuthModalMode } from '../lib/auth-modal';


export const AuthModalProvider = ({ children }: { children?: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setAuthModalOpener((newMode: AuthModalMode) => {
      setMode(newMode);
      setIsOpen(true);
      setError('');
      setSuccess('');
    });
    return () => setAuthModalOpener(null);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'forgot-password') {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${API_URL}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error enviando el correo');
        }
        setSuccess(data.message || 'Te enviamos un enlace seguro para restablecer tu contraseña. Revisa tu correo.');
        setMode('signin');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const endpoint = mode === 'signin' ? '/api/login' : '/api/register';
    const body = mode === 'signin' 
      ? { email, password } 
      : { email, password, full_name: fullName };

    try {
      // Usamos fetch directamente para evitar dependencias circulares con apiClient
      // o problemas si no está inicializado
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}${endpoint.replace('/api', '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }

      if (mode === 'signup') {
        setSuccess(data.message || 'Cuenta creada. Te enviamos un correo para verificar tu cuenta.');
        setPassword('');
        setMode('signin');
        return;
      }

      localStorage.setItem('auth_token', data.token);
      window.location.reload(); // Recargamos para que toda la app tome el nuevo estado
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {children}
      {isOpen && (
        <div className="uix-auth-overlay" role="dialog" aria-modal="true" aria-labelledby="uix-auth-title">
          <div className="uix-auth-modal" role="document">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="uix-auth-close"
              aria-label="Cerrar ventana de acceso"
            >
              ✕
            </button>

            <div className="uix-auth-visual" aria-hidden="true">
              <span className="uix-auth-kicker">Selfcare Sinners</span>
              <h2>Acceso premium</h2>
              <p>Gestiona tus pedidos, favoritos y rutinas desde una experiencia segura y limpia.</p>
              <div className="uix-auth-benefits">
                <span>Pedidos protegidos</span>
                <span>Favoritos sincronizados</span>
                <span>Rutinas personalizadas</span>
              </div>
            </div>

            <div className="uix-auth-form-panel">
              <div className="uix-auth-heading">
                <p>{mode === 'signin' ? 'Bienvenida de vuelta' : mode === 'signup' ? 'Crea tu cuenta' : 'Recupera tu acceso'}</p>
                <h2 id="uix-auth-title">
                  {mode === 'signin' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Recuperar contraseña'}
                </h2>
                <span>
                  {mode === 'signin'
                    ? 'Entra para ver tus pedidos, favoritos y estado de compra.'
                    : mode === 'signup'
                      ? 'Regístrate para guardar favoritos y dar seguimiento a tus pedidos.'
                      : 'Te enviaremos un enlace seguro para restablecer tu contraseña.'}
                </span>
              </div>

              {error && <div className="uix-auth-error" role="alert">{error}</div>}
              {success && <div className="uix-auth-success" role="status" aria-live="polite">{success}</div>}

              <form onSubmit={handleSubmit} className="uix-auth-form">
                {mode === 'signup' && (
                  <label className="uix-auth-field">
                    <span>Nombre completo</span>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Tu nombre"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </label>
                )}

                <label className="uix-auth-field">
                  <span>Correo electrónico</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                {mode !== 'forgot-password' && (
                  <label className="uix-auth-field">
                    <span className="uix-auth-label-row">
                      Contraseña
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => { setMode('forgot-password'); setError(''); }}
                          className="uix-auth-inline-action"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      )}
                    </span>
                    <input
                      type="password"
                      required
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                )}

                <button type="submit" disabled={loading} className="uix-auth-submit">
                  {loading ? 'Procesando...' : (mode === 'signin' ? 'Entrar a mi cuenta' : mode === 'signup' ? 'Crear mi cuenta' : 'Enviar enlace seguro')}
                </button>
              </form>

              <div className="uix-auth-switch">
                {mode === 'signin' ? (
                  <p>¿No tienes una cuenta? <button type="button" onClick={() => { setMode('signup'); setError(''); }}>Regístrate</button></p>
                ) : mode === 'signup' ? (
                  <p>¿Ya tienes una cuenta? <button type="button" onClick={() => { setMode('signin'); setError(''); }}>Inicia sesión</button></p>
                ) : (
                  <p><button type="button" onClick={() => { setMode('signin'); setError(''); }}>Volver a iniciar sesión</button></p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuthSafe();
  return isSignedIn ? <>{children}</> : null;
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuthSafe();
  return !isSignedIn ? <>{children}</> : null;
};

export const UserButton = () => {
  return <AccountMenu triggerClassName="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400" triggerLabel="" anonymousLabel="" />;
};

export const RedirectToSignIn = () => {
  // Cuando se monta este componente, podríamos abrir el modal, pero por ahora mostramos un mensaje
  React.useEffect(() => {
    openAuthDialog('signin');
  }, []);
  return <div>Por favor, inicia sesión...</div>;
};

export const SignInButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div className="cursor-pointer" onClick={() => openAuthDialog('signin')}>{children}</div>;
};

export const SignUpButton = ({ children, mode }: { children: React.ReactNode, mode?: string }) => {
  return <div className="cursor-pointer" onClick={() => openAuthDialog('signup')}>{children}</div>;
};

export const SignIn = () => {
  return <div>Iniciar Sesión Page</div>;
};

export const SignUp = () => {
  return <div>Registrarse Page</div>;
};
