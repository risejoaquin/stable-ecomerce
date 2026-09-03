import React, { useState } from 'react';
import { useAuthSafe } from '../hooks/useAuthSafe';
import { AccountMenu } from './account/AccountMenu';
import { openAuthDialog, setAuthModalOpener, type AuthModalMode } from '../lib/auth-modal';


export const AuthModalProvider = ({ children }: { children?: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setContraseña] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setAuthModalOpener((newMode: AuthModalMode) => {
      setMode(newMode);
      setIsOpen(true);
      setError('');
    });
    return () => setAuthModalOpener(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
        alert(data.message || 'Se ha enviado un enlace para restablecer tu contraseña.');
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

      localStorage.setItem('auth_token', data.token);
      if (mode === 'signup' && data.message) {
        alert(data.message);
      }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">
              {mode === 'signin' ? 'Iniciar Sesión' : mode === 'signup' ? 'Crear Cuenta' : 'Recuperar Contraseña'}
            </h2>
            
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {mode !== 'forgot-password' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                    {mode === 'signin' && (
                      <button 
                        type="button" 
                        onClick={() => { setMode('forgot-password'); setError(''); }} 
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <input 
                    type="password" 
                    required 
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={password}
                    onChange={(e) => setContraseña(e.target.value)}
                  />
                </div>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[var(--color-primary)] text-white font-medium py-2 rounded hover:bg-[#5a5f4d] disabled:opacity-50 transition-colors"
              >
                {loading ? 'Cargando...' : (mode === 'signin' ? 'Iniciar Sesión' : mode === 'signup' ? 'Crear Cuenta' : 'Enviar Enlace')}
              </button>
            </form>

            <div className="mt-4 text-center text-sm">
              {mode === 'signin' ? (
                <p>¿No tienes una cuenta? <button onClick={() => { setMode('signup'); setError(''); }} className="text-[var(--color-primary)] font-semibold hover:underline">Regístrate</button></p>
              ) : mode === 'signup' ? (
                <p>¿Ya tienes una cuenta? <button onClick={() => { setMode('signin'); setError(''); }} className="text-[var(--color-primary)] font-semibold hover:underline">Inicia sesión</button></p>
              ) : (
                <p><button onClick={() => { setMode('signin'); setError(''); }} className="text-[var(--color-primary)] font-semibold hover:underline">Volver a Iniciar Sesión</button></p>
              )}
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
